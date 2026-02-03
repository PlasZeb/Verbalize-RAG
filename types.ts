export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  isListening: boolean;
  volume: number;
}

export interface FileData {
  name: string;
  content: string;
  size: number;
  type: string;
}

export interface TranscriptMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

export type Language = 'en' | 'hu';