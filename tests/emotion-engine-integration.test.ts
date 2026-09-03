import { EmotionEngineClient } from '../src/services/EmotionEngineClient';
import { EmotionAnalysisService } from '../src/services/EmotionAnalysisService';

const FEARING =
  "Fearing for his pack's safety, Mowgli knew he must take a stand to protect the home and family he loved.";
const CLIMAX =
  'Returning to Council Rock just as Shere Khan lunged for Akela, Mowgli brandished a blazing branch, striking the ground and driving the ferocious tiger back into the darkness with roaring flames.';

describe('Emotion Engine integration', () => {
  const engineEnabled = process.env.EMOTION_ENGINE_ENABLED === 'true';

  beforeAll(() => {
    if (!engineEnabled) {
      console.warn('Skipping live Emotion Engine tests (set EMOTION_ENGINE_ENABLED=true to run).');
    }
  });

  (engineEnabled ? test : test.skip)('health check responds when server is running', async () => {
    expect(await EmotionEngineClient.isAvailable()).toBe(true);
  });

  (engineEnabled ? test : test.skip)('maps fear and anger sentences through full analysis service', async () => {
    const service = new EmotionAnalysisService();
    const fearMap = await service.analyzeStoryEmotions('jungle-fear', FEARING, 'en');
    expect(fearMap.analysisSource).toBe('emotion-engine');
    expect(fearMap.segments[0].emotion).toBe('FEARFUL');
    expect(fearMap.segments[0].intensity).toBeGreaterThan(0.5);

    const climaxMap = await service.analyzeStoryEmotions('jungle-climax', CLIMAX, 'en');
    expect(climaxMap.analysisSource).toBe('emotion-engine');
    expect(['ANGRY', 'URGENT', 'FEARFUL', 'SUSPENSEFUL']).toContain(climaxMap.segments[0].emotion);
    expect(climaxMap.segments[0].intensity).toBeGreaterThan(0.6);
  });

  test('falls back to keywords when engine is disabled', async () => {
    process.env.EMOTION_ENGINE_ENABLED = 'false';
    const service = new EmotionAnalysisService();
    const result = await service.analyzeStoryEmotions(
      'fallback-test',
      'She wept tears of heartbreak and tragedy struck the kingdom.',
      'en'
    );
    expect(result.analysisSource).toBe('keyword-fallback');
    expect(result.segments.some((s) => s.emotion === 'SAD')).toBe(true);
  });
});
