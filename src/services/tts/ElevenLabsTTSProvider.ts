import fs from 'fs';
import path from 'path';
import { ITTSProvider, TTSOptions, TTSResult } from './ITTSProvider';
import { TTSProviderCapabilities } from '../../types';
import { ELEVENLABS_VOICES, ELEVENLABS_SUPPORTED_LANGUAGES, selectElevenLabsVoice } from '../../config/elevenlabs-voice.config';

export class ElevenLabsTTSProvider implements ITTSProvider {
  name = 'elevenlabs';
  private apiKey: string;
  private modelId = 'eleven_multilingual_v2';
  private audioOutputDir: string;
  public static quotaExhausted = false;

  constructor(apiKey?: string) {
    const rawKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.apiKey = rawKey.trim();
    this.audioOutputDir = path.join(process.cwd(), 'public', 'audio');

    if (!fs.existsSync(this.audioOutputDir)) {
      try {
        fs.mkdirSync(this.audioOutputDir, { recursive: true });
      } catch {
        // Ignore directory creation error
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (ElevenLabsTTSProvider.quotaExhausted) {
      return false;
    }
    return Boolean(this.apiKey && this.apiKey.length > 10 && !this.apiKey.includes('YOUR_KEY'));
  }

  getCapabilities(): TTSProviderCapabilities {
    return {
      languages: ELEVENLABS_SUPPORTED_LANGUAGES,
      voices: ELEVENLABS_VOICES.map(v => v.voiceId),
      supportsEmotion: true,
      supportsProsody: true,
      supportsPitch: false,
      supportsRate: false,
      supportsVolume: false,
      supportsSSML: false
    };
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    if (ElevenLabsTTSProvider.quotaExhausted) {
      throw new Error('ELEVENLABS_QUOTA_EXCEEDED: ElevenLabs account quota exceeded or subscription required.');
    }

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY_MISSING: ELEVENLABS_API_KEY is not configured in environment.');
    }

    const cleanText = options.text.trim();
    if (!cleanText) {
      throw new Error('TTS_INPUT_EMPTY: Story text cannot be empty');
    }

    const targetLang = (options.language || 'en').toLowerCase().trim();
    if (!ELEVENLABS_SUPPORTED_LANGUAGES.includes(targetLang) && !ELEVENLABS_SUPPORTED_LANGUAGES.some(l => targetLang.startsWith(l))) {
      const err: any = new Error(`Narration is currently unavailable for this language (${targetLang}).`);
      err.code = 'TTS_LANGUAGE_UNSUPPORTED';
      throw err;
    }

    // Select ElevenLabs Voice
    const voiceConfig = selectElevenLabsVoice(
      options.gender || 'FEMALE',
      options.locale || 'ADULT',
      options.voiceName || 'Fairy Tale'
    );
    const voiceId = options.voiceId && options.voiceId.startsWith('21m') ? options.voiceId : voiceConfig.voiceId;

    // Map emotion parameters
    let stability = 0.50;
    let similarityBoost = 0.75;
    let style = 0.10;

    if (options.emotion) {
      const type = options.emotion.type;
      const intensity = Math.min(1.0, Math.max(0.0, options.emotion.intensity));

      if (type === 'SAD' || type === 'MELANCHOLIC') {
        stability = 0.75;
        similarityBoost = 0.85;
        style = 0.15 * intensity;
      } else if (type === 'JOYFUL' || type === 'EXCITED' || type === 'TRIUMPHANT') {
        stability = 0.35;
        similarityBoost = 0.65;
        style = 0.50 * intensity;
      } else if (type === 'SUSPENSEFUL' || type === 'FEARFUL' || type === 'URGENT') {
        stability = 0.55;
        similarityBoost = 0.80;
        style = 0.35 * intensity;
      } else if (type === 'AWE' || type === 'CURIOUS' || type === 'ROMANTIC') {
        stability = 0.45;
        similarityBoost = 0.75;
        style = 0.30 * intensity;
      }
    }

    console.log(`[ElevenLabsTTSProvider] Synthesizing segment via ElevenLabs API (Voice: ${voiceConfig.voiceName}, Model: ${this.modelId}, Emotion: ${options.emotion?.type || 'NORMAL'})...`);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: this.modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[ElevenLabsTTSProvider] ElevenLabs API status ${response.status}: ${errorText.substring(0, 200)}`);

        if (response.status === 401 || response.status === 402 || response.status === 429 || errorText.includes('quota_exceeded') || errorText.includes('paid_plan_required')) {
          console.warn('[ElevenLabsTTSProvider] ElevenLabs quota exceeded or account restriction. Marking ElevenLabs unavailable.');
          ElevenLabsTTSProvider.quotaExhausted = true;
          throw new Error('ELEVENLABS_QUOTA_EXCEEDED: ElevenLabs account quota exceeded or subscription required.');
        }

        throw new Error(`ELEVEN_LABS_API_ERROR: ElevenLabs API synthesis failed with status ${response.status}.`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);

      if (audioBuffer.length < 1024) {
        throw new Error('ELEVENLABS_AUDIO_TOO_SMALL: ElevenLabs returned empty or invalid audio buffer.');
      }

      const fileName = `elevenlabs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.mp3`;
      const filePath = path.join(this.audioOutputDir, fileName);
      fs.writeFileSync(filePath, audioBuffer);

      const wordCount = cleanText.split(/\s+/).length;
      const actualDuration = Math.max(2, Math.round((wordCount / 2.4) * 10) / 10);
      const host = process.env.BACKEND_HOST || 'http://localhost:3005';
      const audioUrl = `${host}/audio/${fileName}`;

      return {
        provider: this.name,
        voiceId,
        voiceName: voiceConfig.voiceName,
        language: options.language || 'English',
        locale: options.locale || 'en-US',
        audioUrl,
        duration: actualDuration,
        format: 'mp3',
        storagePath: `public/audio/${fileName}`,
        status: 'READY',
        emotionAware: true
      };
    } catch (err: any) {
      if (err.message?.includes('ELEVENLABS_QUOTA_EXCEEDED')) {
        ElevenLabsTTSProvider.quotaExhausted = true;
      }
      throw err;
    }
  }
}
