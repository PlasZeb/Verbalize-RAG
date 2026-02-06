import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { Language, ModelType, VoiceName } from '../types';
import { config as appConfig } from '../utils/config';

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
  private silentAudio: HTMLAudioElement | null = null;
  
  private currentInputTranscription: string = '';
  private currentOutputTranscription: string = '';

  public onVolumeChange: ((volume: number) => void) | null = null;

  constructor() {
    this.refreshAI();
  }

  private refreshAI() {
    if (appConfig.isValid) {
      this.ai = new GoogleGenAI({ apiKey: appConfig.apiKey });
    }
  }

  private initSilentAudio() {
    if (!this.silentAudio) {
      this.silentAudio = new Audio();
      this.silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZRTm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      this.silentAudio.loop = true;
    }
    this.silentAudio.play().catch(() => {});
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
      this.refreshAI();
      if (!this.ai) throw new Error("API Key not found or invalid.");

      this.initSilentAudio();
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
      this.nextStartTime = 0; 

      const truncatedContext = fileContext.substring(0, 100000);
      const languageInstruction = language === 'hu' ? "Speak HUNGARIAN ONLY." : "Speak ENGLISH ONLY.";

      const config = {
        model: model,
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
          onerror: (e: any) => {
            console.error("Native Live Error:", e);
            onError(new Error(e?.message || "Kapcsolódási hiba. Kérlek próbáld újra!"));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: enableTranscription ? {} : undefined,
          outputAudioTranscription: enableTranscription ? {} : undefined,
          systemInstruction: `SYSTEM: Native Audio Interface. ${languageInstruction} Character: Professional AI Assistant. Context: ${truncatedContext || "No context provided."}`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      };

      const sessionPromise = this.ai.live.connect(config);
      (this as any).sessionPromise = sessionPromise;
      
      sessionPromise.then(sess => {
        this.activeSession = sess;
      }).catch(err => {
        onError(err);
      });

      return () => this.disconnect();
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Rendszerhiba az indításkor.'));
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
    onTranscript: (sender: 'user' | 'model', text: string, isFinal: boolean) => void
  ) {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      const audioData = base64ToUint8Array(base64Audio);
      // scheduling with a tiny safety buffer (0.05s) for jitter
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime + 0.05);
      const audioBuffer = await decodeAudioData(audioData, this.outputAudioContext, 24000, 1);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.addEventListener('ended', () => { this.sources.delete(source); });
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
    }

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
        if (this.currentInputTranscription.trim()) onTranscript('user', this.currentInputTranscription, true);
        if (this.currentOutputTranscription.trim()) onTranscript('model', this.currentOutputTranscription, true);
        this.currentInputTranscription = '';
        this.currentOutputTranscription = '';
      }
    }

    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => { try { source.stop(); } catch(e) {} });
      this.sources.clear();
      this.nextStartTime = 0;
      this.currentOutputTranscription = '';
    }
  }

  disconnect() {
    if (this.activeSession) { try { this.activeSession.close(); } catch (e) {} }
    this.stopAudio();
    (this as any).sessionPromise = null;
    this.activeSession = null;
  }

  private stopAudio() {
    if (this.stream) { this.stream.getTracks().forEach(track => track.stop()); this.stream = null; }
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.inputAudioContext) { try { this.inputAudioContext.close(); } catch(e){} this.inputAudioContext = null; }
    if (this.outputAudioContext) { try { this.outputAudioContext.close(); } catch(e){} this.outputAudioContext = null; }
    this.sources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.sources.clear();
  }
}

export const liveClient = new LiveClient();
