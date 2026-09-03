import { ITTSProvider } from './ITTSProvider';
import { EmotionEngineTTSProvider } from './EmotionEngineTTSProvider';
import { ElevenLabsTTSProvider } from './ElevenLabsTTSProvider';
import { DefaultTTSProvider } from './DefaultTTSProvider';

function useLegacyTTS(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (process.env.USE_LEGACY_ELEVENLABS || '').toLowerCase()
  );
}

export class TTSProviderFactory {
  static async getProvider(requestedProvider = 'auto'): Promise<ITTSProvider> {
    if (useLegacyTTS()) {
      if (requestedProvider === 'elevenlabs' || requestedProvider === 'auto') {
        const elevenlabs = new ElevenLabsTTSProvider();
        if (await elevenlabs.isAvailable()) {
          console.log('[TTSProviderFactory] Legacy mode: ElevenLabs selected.');
          return elevenlabs;
        }
      }
      console.log('[TTSProviderFactory] Legacy mode: DefaultTTSProvider selected.');
      return new DefaultTTSProvider();
    }

    console.log('[TTSProviderFactory] Selected TTS Engine: Emotion Engine (Piper /narrate).');
    return new EmotionEngineTTSProvider();
  }
}
