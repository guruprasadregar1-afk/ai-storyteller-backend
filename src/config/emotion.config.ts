/**
 * Emotion Engine integration settings (all overridable via environment).
 */

export interface EmotionIntensityThresholds {
  joyHigh: number;
  sadnessHigh: number;
  fearHigh: number;
  angerHigh: number;
  surpriseHigh: number;
}

export interface EmotionEngineConfig {
  /** Base URL for the local Emotion Engine FastAPI service */
  url: string;
  /** When false, skip HTTP calls and use keyword fallback immediately */
  enabled: boolean;
  /** POST /tag timeout (ms) */
  tagTimeoutMs: number;
  /** POST /narrate minimum timeout (ms) — scaled upward for long stories */
  narrateTimeoutMs: number;
  /** POST /narrate maximum timeout (ms) */
  narrateTimeoutMaxMs: number;
  /** GET /health timeout (ms) */
  healthTimeoutMs: number;
  /** Intensity cutoffs for mapping ML labels → Storyteller prosody tiers */
  thresholds: EmotionIntensityThresholds;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getEmotionEngineConfig(): EmotionEngineConfig {
  return {
    url: (process.env.EMOTION_ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
    enabled: readBoolean(process.env.EMOTION_ENGINE_ENABLED, true),
    tagTimeoutMs: readNumber(process.env.EMOTION_ENGINE_TAG_TIMEOUT_MS, 120_000),
    narrateTimeoutMs: readNumber(process.env.EMOTION_ENGINE_NARRATE_TIMEOUT_MS, 600_000),
    narrateTimeoutMaxMs: readNumber(process.env.EMOTION_ENGINE_NARRATE_TIMEOUT_MAX_MS, 1_800_000),
    healthTimeoutMs: readNumber(process.env.EMOTION_ENGINE_HEALTH_TIMEOUT_MS, 5_000),
    thresholds: {
      joyHigh: readNumber(process.env.EMOTION_JOY_HIGH_THRESHOLD, 0.7),
      sadnessHigh: readNumber(process.env.EMOTION_SADNESS_HIGH_THRESHOLD, 0.7),
      fearHigh: readNumber(process.env.EMOTION_FEAR_HIGH_THRESHOLD, 0.7),
      angerHigh: readNumber(process.env.EMOTION_ANGER_HIGH_THRESHOLD, 0.7),
      surpriseHigh: readNumber(process.env.EMOTION_SURPRISE_HIGH_THRESHOLD, 0.6),
    },
  };
}

/**
 * Scale /narrate client timeout for CPU Piper on long stories.
 * Conservative: ~60ms/char + 5s/segment overhead, clamped to config min/max.
 */
export function computeNarrateTimeoutMs(options: {
  textLength: number;
  segmentCount: number;
  config?: EmotionEngineConfig;
}): number {
  const config = options.config ?? getEmotionEngineConfig();
  const baseMs = 120_000;
  const perCharMs = 60;
  const perSegmentMs = 5_000;
  const scaled = baseMs + options.textLength * perCharMs + options.segmentCount * perSegmentMs;
  return Math.min(config.narrateTimeoutMaxMs, Math.max(config.narrateTimeoutMs, scaled));
}
