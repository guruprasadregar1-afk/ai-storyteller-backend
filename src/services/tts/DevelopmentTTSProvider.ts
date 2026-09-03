import { ITTSProvider, TTSOptions, TTSResult } from './ITTSProvider';
import { TTSProviderCapabilities } from '../../types';
import { getLanguageConfig } from '../../config/language.config';

export class DevelopmentTTSProvider implements ITTSProvider {
  name = 'development-tts';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities(): TTSProviderCapabilities {
    return {
      languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'bn', 'mr', 'te', 'ta', 'ur'],
      voices: ['voice-warm-fairy-tale', 'voice-warrior-king', 'voice-child-friendly', 'voice-reflective-memoir', 'voice-maritime-male', 'voice-cinematic-male'],
      supportsEmotion: true,
      supportsProsody: true,
      supportsPitch: true,
      supportsRate: true,
      supportsVolume: true,
      supportsSSML: true
    };
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const cleanText = options.text.trim();
    const wordCount = cleanText.split(/\s+/).length;

    // Prosody rate modifier (e.g. pace 0.85x vs 1.15x)
    const rateModifier = options.prosody?.rate || 1.0;
    const baseDuration = Math.max(2, Math.round((wordCount / 2.5) * 10) / 10);
    const actualDuration = Math.round((baseDuration / rateModifier) * 10) / 10;

    const voiceName = options.voiceName || 'Warm Fairy Tale Narrator';
    const voiceId = options.voiceId || 'voice-warm-fairy-tale';
    const langConfig = getLanguageConfig(options.language || 'en');

    // Generates spoken narration audio stream URL for actual spoken text in the target language locale
    const textSnippet = cleanText.length > 200 ? cleanText.substring(0, 200) : cleanText;
    const langCode = langConfig.code;
    const spokenAudioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textSnippet)}&tl=${encodeURIComponent(langCode)}&client=tw-ob`;
    const storagePath = `stories/audio/${langCode}/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.mp3`;

    return {
      provider: this.name,
      voiceId,
      voiceName,
      language: langConfig.name,
      locale: options.locale || langConfig.locale,
      audioUrl: spokenAudioUrl,
      duration: actualDuration,
      format: 'mp3',
      storagePath,
      status: 'READY',
      emotionAware: Boolean(options.emotion)
    };
  }
}
