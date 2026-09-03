import { TTSProviderCapabilities } from '../../types';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  voiceName?: string;
  gender?: string;
  language?: string;
  locale?: string;
  emotion?: {
    type: string;
    intensity: number;
  };
  prosody?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  };
  segmentIndex?: number;
  narratorRole?: string;
  jobId?: string;
  characterMap?: Record<string, string>;
  emotionSegments?: Array<{
    speaker?: string;
    text: string;
    emotion: string;
    intensity: number;
    role?: string;
  }>;
}

export interface TTSResult {
  provider: string;
  voiceId: string;
  voiceName: string;
  language: string;
  locale?: string;
  audioUrl: string;
  duration: number; // actual duration in seconds
  format: string;
  storagePath?: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
  emotionAware?: boolean;
  genderUsed?: string;
}

export interface ITTSProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getCapabilities(): TTSProviderCapabilities;
  synthesize(options: TTSOptions): Promise<TTSResult>;
}
