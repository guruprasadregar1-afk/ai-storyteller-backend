/**
 * Integration test: StoryAudioService → Emotion Engine POST /narrate
 * Requires Emotion Engine running at EMOTION_ENGINE_URL with Piper voices downloaded.
 */
import { StoryAudioService } from '../src/services/StoryAudioService';
import { EmotionEngineClient } from '../src/services/EmotionEngineClient';
import { buildPublicAudioResponse } from '../src/common/utils/audio-response.util';

const engineUp = async () => EmotionEngineClient.isAvailable();

describe('Emotion Engine TTS integration', () => {
  const audioService = new StoryAudioService();

  beforeAll(() => {
    process.env.EMOTION_ENGINE_ENABLED = 'true';
    process.env.USE_LEGACY_ELEVENLABS = 'false';
  });

  test('StoryAudioService uses emotion-engine provider with transparent audio fields', async () => {
    if (!(await engineUp())) {
      console.warn('Skipping: Emotion Engine not reachable at', process.env.EMOTION_ENGINE_URL);
      return;
    }

    const narrator = {
      genderPresentation: 'MALE',
      ageGroup: 'ADULT',
      style: 'Cinematic Storyteller',
      tone: 'Warm',
      emotion: 'Inspiring',
      pace: 'NORMAL',
      language: 'English',
      accent: 'Neutral',
      audience: 'General',
      reasoning: 'test',
      confidence: 1,
      selectedProvider: 'groq',
      selectedModel: 'test',
    };

    const emotionMap = {
      language: 'en',
      overallMood: 'test',
      segments: [
        {
          segmentIndex: 1,
          text: 'The jungle was quiet under the moon.',
          emotion: 'CALM' as const,
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL' as const,
        },
        {
          segmentIndex: 2,
          text: 'Then the tiger lunged from the shadows!',
          emotion: 'FEARFUL' as const,
          intensity: 0.85,
          pace: 1.1,
          pitch: 1,
          volume: 1,
          pauseStyle: 'DRAMATIC' as const,
        },
      ],
    };

    const start = Date.now();
    const audio = await audioService.generateNarrationAudio(
      `tts-integration-${Date.now()}`,
      'The jungle was quiet under the moon. Then the tiger lunged from the shadows!',
      narrator as any,
      emotionMap,
      'en'
    );
    const elapsedMs = Date.now() - start;

    expect(audio.provider).toBe('emotion-engine');
    expect(audio.genderUsed).toBe('MALE');
    expect(audio.audioUrl).toContain('/audio/');
    expect(audio.emotionAware).toBe(true);

    const payload = buildPublicAudioResponse(audio, 'English', narrator.genderPresentation);
    expect(payload.voiceMismatch).toBe(false);
    expect(payload.provider).toBe('emotion-engine');

    console.log(`[timing] 2-segment English narration: ${elapsedMs}ms, duration=${audio.duration}s`);
  }, 120_000);

  test('hard error when Emotion Engine unreachable (no silent fallback)', async () => {
    const originalUrl = process.env.EMOTION_ENGINE_URL;
    process.env.EMOTION_ENGINE_URL = 'http://127.0.0.1:59999';
    process.env.USE_LEGACY_ELEVENLABS = 'false';

    await expect(
      audioService.generateNarrationAudio('offline-test', 'Hello world.', null, null, 'en')
    ).rejects.toThrow(/TTS_GENERATION_FAILED.*(connection refused|health check failed)/i);

    process.env.EMOTION_ENGINE_URL = originalUrl;
  });
});
