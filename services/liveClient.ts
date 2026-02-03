import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Language } from '../types';

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private activeSession: any = null;
  
  // Transcription buffers
  private currentInputTranscription: string = '';
  private currentOutputTranscription: string = '';

  public onVolumeChange: ((volume: number) => void) | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(
    fileContext: string,
    language: Language,
    onOpen: () => void,
    onClose: () => void,
    onError: (e: Error) => void,
    onTranscript: (sender: 'user' | 'model', text: string, isFinal: boolean) => void
  ): Promise<() => void> {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset buffers and state
      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
      this.nextStartTime = 0; // CRITICAL: Reset timing cursor for new audio context
      this.activeSession = null;

      const languageInstruction = language === 'hu' 
        ? "The user has selected HUNGARIAN. You MUST speak and reply in Hungarian." 
        : "The user has selected ENGLISH. You MUST speak and reply in English.";

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            this.startAudioInput();
            onOpen();
          },
          onmessage: (message: LiveServerMessage) => this.handleMessage(message, onTranscript),
          onclose: () => {
            this.stopAudio();
            onClose();
          },
          onerror: (e: ErrorEvent) => {
            console.error(e);
            onError(new Error("Connection error occurred"));
          },
        },
        config: {
          // Use string literal 'AUDIO' to avoid issues with Modality enum being undefined in some ESM builds
          responseModalities: ['AUDIO' as any], 
          // Enable transcription
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [{
              text: `
                You are a highly intelligent, helpful AI assistant.
                
                CORE SETTINGS:
                ${languageInstruction}
                
                CORE OBJECTIVE:
                The user has uploaded a document/content. You are an expert on this content. 
                You must answer questions, summarize, or discuss topics based specifically on the provided context below.
                
                BEHAVIOR:
                1. Conciseness: Keep spoken responses relatively concise and natural, suitable for voice conversation.
                2. Accuracy: Stick to the facts in the provided document. If the answer isn't there, politely say so.

                ----- BEGIN UPLOADED DOCUMENT CONTEXT -----
                ${fileContext || "No document provided. Politely ask the user to upload a file to begin the RAG session."}
                ----- END UPLOADED DOCUMENT CONTEXT -----
              `
            }]
          },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      };

      const sessionPromise = this.ai.live.connect(config);

      // Store session promise for sending data
      (this as any).sessionPromise = sessionPromise;
      
      // Capture active session for cleanup
      sessionPromise.then(sess => {
        this.activeSession = sess;
      });

      return () => this.disconnect();

    } catch (err) {
      onError(err instanceof Error ? err : new Error('Failed to initialize audio'));
      return () => {};
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    // 4096 buffer size provides a good balance between latency and processing overhead
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const volume = Math.sqrt(sum / inputData.length);
      if (this.onVolumeChange) this.onVolumeChange(volume);

      const pcmBlob = createPcmBlob(inputData);
      
      const sessionPromise = (this as any).sessionPromise;
      if (sessionPromise) {
        sessionPromise.then((session: any) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(
    message: LiveServerMessage, 
    onTranscript: (sender: 'user' | 'model', text: string, isFinal: boolean) => void
  ) {
    // 1. Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

    if (base64Audio && this.outputAudioContext && this.outputNode) {
      const audioData = base64ToUint8Array(base64Audio);
      
      // Sync logic
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      
      const audioBuffer = await decodeAudioData(
        audioData,
        this.outputAudioContext,
        24000,
        1
      );

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

    // 2. Handle Transcription
    const serverContent = message.serverContent;
    if (serverContent) {
      if (serverContent.outputTranscription?.text) {
        this.currentOutputTranscription += serverContent.outputTranscription.text;
        onTranscript('model', this.currentOutputTranscription, false);
      } 
      
      if (serverContent.inputTranscription?.text) {
        this.currentInputTranscription += serverContent.inputTranscription.text;
        onTranscript('user', this.currentInputTranscription, false);
      }

      if (serverContent.turnComplete) {
        // Send final updates if there's content
        if (this.currentInputTranscription.trim()) {
           onTranscript('user', this.currentInputTranscription, true);
        }
        if (this.currentOutputTranscription.trim()) {
           onTranscript('model', this.currentOutputTranscription, true);
        }

        // Reset buffers
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
      }
    }

    // 3. Handle Interruptions
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.sources.clear();
      this.nextStartTime = 0;
      
      // Clear current model output buffer as it was interrupted
      this.currentOutputTranscription = '';
    }
  }

  disconnect() {
    if (this.activeSession) {
      try {
        this.activeSession.close();
      } catch (e) {
        console.warn("Failed to close session explicitly:", e);
      }
      this.activeSession = null;
    }
    
    this.stopAudio();
    // Force reset the promise so we don't try to send data to a dead session
    (this as any).sessionPromise = null;
  }

  private stopAudio() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.sources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.sources.clear();
  }
}

export const liveClient = new LiveClient();