import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Language, ModelType, VoiceName } from '../types';
import { config as appConfig } from '../utils/config';

const searchTool: FunctionDeclaration = {
  name: 'search_knowledge_base',
  parameters: {
    type: Type.OBJECT,
    description: 'Searches the uploaded document library for specific information using semantic vector search in Pinecone.',
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query or question to look up.',
      },
    },
    required: ['query'],
  },
};

export class LiveClient {
  private ai: GoogleGenAI | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private activeSession: any = null;
  
  private currentInputTranscription: string = '';
  private currentOutputTranscription: string = '';

  public onVolumeChange: ((volume: number) => void) | null = null;
  public onToolCall: ((name: string, args: any) => void) | null = null;

  constructor() {
    this.refreshAI();
  }

  private refreshAI() {
    if (appConfig.isValid) {
      this.ai = new GoogleGenAI({ apiKey: appConfig.apiKey });
    }
  }

  async connect(
    fileContext: string,
    language: Language,
    model: ModelType,
    voice: VoiceName,
    enableTranscription: boolean,
    onOpen: () => void,
    onClose: () => void,
    onError: (e: Error) => void,
    onTranscript: (sender: 'user' | 'model', text: string, isFinal: boolean) => void
  ): Promise<() => void> {
    try {
      // 1. Fetch API key and config from backend if needed
      if (!appConfig.isValid) {
        try {
          const response = await fetch(appConfig.sessionConfigEndpoint);
          if (response.ok) {
            const data = await response.json();
            appConfig.apiKey = data.apiKey;
            this.refreshAI();
          }
        } catch (fetchError) {
          console.error("Failed to fetch session config from backend:", fetchError);
        }
      }

      this.refreshAI();
      if (!this.ai) throw new Error("API Key hiányzik. Kérjük, ellenőrizze a backend kapcsolatot.");

      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const languageInstruction = language === 'hu' ? "Speak HUNGARIAN ONLY." : "Speak ENGLISH ONLY.";

      const config = {
        model: model,
        callbacks: {
          onopen: () => {
            this.startAudioInput();
            onOpen();
          },
          onmessage: (message: LiveServerMessage) => this.handleMessage(message, onTranscript, fileContext),
          onclose: () => {
            this.stopAudio();
            onClose();
          },
          onerror: (e: any) => onError(new Error(e?.message || "Hiba történt.")),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: enableTranscription ? {} : undefined,
          outputAudioTranscription: enableTranscription ? {} : undefined,
          tools: [{ functionDeclarations: [searchTool] }],
          systemInstruction: `You are a professional research assistant. ${languageInstruction} 
          When asked about the document, ALWAYS use the 'search_knowledge_base' tool. 
          Respond naturally based on the search results provided.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      };

      const sessionPromise = this.ai.live.connect(config);
      (this as any).sessionPromise = sessionPromise;
      
      sessionPromise.then(sess => {
        this.activeSession = sess;
      });

      return () => this.disconnect();
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Indítási hiba.'));
      return () => {};
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream) return;
    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      if (this.onVolumeChange) this.onVolumeChange(Math.sqrt(sum / inputData.length));

      const sessionPromise = (this as any).sessionPromise;
      if (sessionPromise) {
        sessionPromise.then((session: any) => {
          if (session) session.sendRealtimeInput({ media: createPcmBlob(inputData) });
        });
      }
    };
    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(
    message: LiveServerMessage, 
    onTranscript: (sender: 'user' | 'model', text: string, isFinal: boolean) => void,
    fileContext: string
  ) {
    // 1. Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      const audioData = base64ToUint8Array(base64Audio);
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime + 0.05);
      const audioBuffer = await decodeAudioData(audioData, this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    // 2. Tool Calls (REAL API HÍVÁS)
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (this.onToolCall) this.onToolCall(fc.name, fc.args);
        
        let searchResult = "Nincs találat a dokumentumban.";
        
        try {
          // Senior megoldás: Hívjuk a saját biztonságos backendünket
          const response = await fetch(appConfig.searchApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: fc.args.query })
          });
          
          if (response.ok) {
            const data = await response.json();
            searchResult = data.text || JSON.stringify(data);
          } else {
            // Fallback: Ha a backend még nem él, használjuk a feltöltött kontextust
            searchResult = fileContext.substring(0, 2000); 
          }
        } catch (e) {
          console.error("Search API Error, using fallback context:", e);
          searchResult = fileContext.substring(0, 2000);
        }

        const session = await (this as any).sessionPromise;
        session.sendToolResponse({
          functionResponses: [{
            id: fc.id,
            name: fc.name,
            response: { result: searchResult },
          }]
        });
      }
    }

    // 3. Transcripts
    const sc = message.serverContent;
    if (sc) {
      if (sc.outputTranscription?.text) {
        this.currentOutputTranscription += sc.outputTranscription.text;
        onTranscript('model', this.currentOutputTranscription, false);
      } 
      if (sc.inputTranscription?.text) {
        this.currentInputTranscription += sc.inputTranscription.text;
        onTranscript('user', this.currentInputTranscription, false);
      }
      if (sc.turnComplete) {
        if (this.currentInputTranscription.trim()) onTranscript('user', this.currentInputTranscription, true);
        if (this.currentOutputTranscription.trim()) onTranscript('model', this.currentOutputTranscription, true);
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
      }
    }

    if (message.serverContent?.interrupted) {
      this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  disconnect() {
    if (this.activeSession) { try { this.activeSession.close(); } catch (e) {} }
    this.stopAudio();
    (this as any).sessionPromise = null;
    this.activeSession = null;
  }

  private stopAudio() {
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.inputAudioContext) { try { this.inputAudioContext.close(); } catch(e){} this.inputAudioContext = null; }
    if (this.outputAudioContext) { try { this.outputAudioContext.close(); } catch(e){} this.outputAudioContext = null; }
    this.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.sources.clear();
  }
}

export const liveClient = new LiveClient();
