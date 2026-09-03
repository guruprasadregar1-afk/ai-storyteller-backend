import { computeNarrateTimeoutMs, getEmotionEngineConfig } from '../src/config/emotion.config';

describe('computeNarrateTimeoutMs', () => {
  test('uses floor for short stories', () => {
    const config = getEmotionEngineConfig();
    expect(
      computeNarrateTimeoutMs({ textLength: 200, segmentCount: 2, config })
    ).toBe(config.narrateTimeoutMs);
  });

  test('scales for Tell-Tale Heart length (~11k chars)', () => {
    const config = getEmotionEngineConfig();
    const timeout = computeNarrateTimeoutMs({
      textLength: 11_092,
      segmentCount: 80,
      config,
    });
    expect(timeout).toBeGreaterThan(config.narrateTimeoutMs);
    expect(timeout).toBeLessThanOrEqual(config.narrateTimeoutMaxMs);
    expect(timeout).toBe(1_185_520);
  });
});

describe('EmotionEngineClient error classification', () => {
  test('unreachable integration test distinguishes connection refused', async () => {
    const originalUrl = process.env.EMOTION_ENGINE_URL;
    process.env.EMOTION_ENGINE_URL = 'http://127.0.0.1:59999';
    process.env.EMOTION_ENGINE_ENABLED = 'true';

    const { EmotionEngineClient } = await import('../src/services/EmotionEngineClient');
    const health = await EmotionEngineClient.checkHealth();
    expect(health.ok).toBe(false);
    if (!health.ok) {
      expect(health.reason).toBe('connection_refused');
    }

    process.env.EMOTION_ENGINE_URL = originalUrl;
  });
});
