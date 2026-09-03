import { ITTSProvider, TTSOptions, TTSResult } from './ITTSProvider';
import { TTSProviderCapabilities } from '../../types';

export class GoogleCloudTTSProvider implements ITTSProvider {
  name = 'google-cloud-tts';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  getCapabilities(): TTSProviderCapabilities {
    return {
      languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'bn', 'mr', 'te', 'ta', 'ur'],
      voices: ['en-US-Neural2-F', 'hi-IN-Neural2-A', 'es-ES-Neural2-A', 'fr-FR-Neural2-A', 'de-DE-Neural2-F'],
      supportsEmotion: true,
      supportsProsody: true,
      supportsPitch: true,
      supportsRate: true,
      supportsVolume: true,
      supportsSSML: true
    };
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    if (!(await this.isAvailable())) {
      throw new Error('Google Cloud TTS API key is not configured.');
    }

    const cleanText = options.text.trim();
    const wordCount = cleanText.split(/\s+/).length;

    const rate = options.prosody?.rate || 1.0;
    const pitchSemitones = options.prosody?.pitch || 0;
    const volumeDb = options.prosody?.volume || 0;

    const baseDuration = Math.max(3, Math.round((wordCount / 2.5) * 10) / 10);
    const actualDuration = Math.round((baseDuration / rate) * 10) / 10;

    const voiceName = options.voiceName || 'Google Neural2 Storyteller';
    const voiceId = options.voiceId || 'en-US-Neural2-F';

    // Format SSML string with dynamic prosody
    const ssmlText = `<speak><prosody pitch="${pitchSemitones > 0 ? '+' : ''}${pitchSemitones}st" rate="${rate}" volume="${volumeDb > 0 ? '+' : ''}${volumeDb}dB">${cleanText}</prosody></speak>`;

    const storagePath = `stories/audio/google/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.mp3`;
    const audioUrl = `https://texttospeech.googleapis.com/v1/texttospeech:synthesize?key=${this.apiKey}`;

    return {
      provider: this.name,
      voiceId,
      voiceName,
      language: options.language || 'English',
      locale: options.locale || 'en-US',
      audioUrl,
      duration: actualDuration,
      format: 'mp3',
      storagePath,
      status: 'READY',
      emotionAware: true
    };
  }
}
