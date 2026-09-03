import http from 'http';
import { computeNarrateTimeoutMs, getEmotionEngineConfig } from '../config/emotion.config';

// ─────────────────────────────────────────────────────────────────
// EmotionEngineClient — HTTP client for the local Emotion Engine
// Calls POST /tag on the Python FastAPI server to get ML-powered
// sentence-level emotion tags. Falls back gracefully if unavailable.
// ─────────────────────────────────────────────────────────────────

export interface EmotionEngineSegment {
  speaker: string;
  text: string;
  emotion: string;
  intensity: number;
  role: string;
}

export interface EmotionEngineResponse {
  segments: EmotionEngineSegment[];
  segment_count: number;
  tagger_mode: string;
}

export interface EmotionEngineNarrateSegment {
  speaker?: string;
  text: string;
  emotion: string;
  intensity: number;
  role?: string;
}

export interface EmotionEngineNarrateRequest {
  segments: EmotionEngineNarrateSegment[];
  language: string;
  narrator_role?: string;
  job_id?: string;
  character_map?: Record<string, string>;
}

export interface EmotionEngineNarrateResponse {
  provider: string;
  voice_id: string;
  voice_name: string;
  gender_used: string;
  audio_url: string;
  storage_path: string;
  duration: number;
  format: string;
  emotion_aware: boolean;
  segment_count: number;
  voice_gaps: string[];
}

export type EmotionEngineHealthResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'disabled' | 'connection_refused' | 'timeout' | 'connection_reset' | 'http_error';
      detail: string;
    };

function classifyRequestError(err: unknown, timeoutMs?: number): Error {
  const nodeErr = err as NodeJS.ErrnoException;
  const code = nodeErr?.code;
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes('timed out') || code === 'ETIMEDOUT') {
    return new Error(
      `Emotion Engine request timed out after ${timeoutMs ?? '?'}ms — CPU Piper synthesis may still be running on the server`
    );
  }
  if (code === 'ECONNREFUSED') {
    return new Error(
      'Emotion Engine connection refused — no process is listening at EMOTION_ENGINE_URL'
    );
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return new Error(
      'Emotion Engine connection reset — the server may have crashed or closed the connection during processing'
    );
  }
  return err instanceof Error ? err : new Error(message);
}

function httpRequest(
  url: string,
  method: 'GET' | 'POST',
  body?: string,
  timeoutMs?: number
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: body
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        : undefined,
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(classifyRequestError(new Error(`Emotion Engine request timed out after ${timeoutMs}ms`), timeoutMs));
    });
    req.on('error', (err) => reject(classifyRequestError(err, timeoutMs)));

    if (body) req.write(body);
    req.end();
  });
}

export class EmotionEngineClient {
  static async checkHealth(): Promise<EmotionEngineHealthResult> {
    const config = getEmotionEngineConfig();
    if (!config.enabled) {
      return { ok: false, reason: 'disabled', detail: 'EMOTION_ENGINE_ENABLED=false' };
    }

    try {
      const res = await httpRequest(
        `${config.url}/health`,
        'GET',
        undefined,
        config.healthTimeoutMs
      );
      if (res.status === 200) {
        return { ok: true };
      }
      return {
        ok: false,
        reason: 'http_error',
        detail: `GET /health returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      const message = err?.message || String(err);
      if (message.includes('timed out')) {
        return {
          ok: false,
          reason: 'timeout',
          detail: `GET /health timed out after ${config.healthTimeoutMs}ms — the server may be busy with a long /narrate request`,
        };
      }
      if (message.includes('connection refused')) {
        return { ok: false, reason: 'connection_refused', detail: message };
      }
      if (message.includes('connection reset')) {
        return { ok: false, reason: 'connection_reset', detail: message };
      }
      return { ok: false, reason: 'http_error', detail: message };
    }
  }

  static async isAvailable(): Promise<boolean> {
    const health = await EmotionEngineClient.checkHealth();
    return health.ok;
  }

  static async tagText(
    text: string,
    characterMap?: Record<string, string>
  ): Promise<EmotionEngineResponse> {
    const config = getEmotionEngineConfig();
    const payload: { text: string; character_map?: Record<string, string> } = { text };
    if (characterMap && Object.keys(characterMap).length > 0) {
      payload.character_map = characterMap;
    }

    const body = JSON.stringify(payload);
    const res = await httpRequest(`${config.url}/tag`, 'POST', body, config.tagTimeoutMs);

    if (res.status !== 200) {
      throw new Error(`Emotion Engine /tag returned HTTP ${res.status}: ${res.body.substring(0, 200)}`);
    }

    const parsed: EmotionEngineResponse = JSON.parse(res.body);

    if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      throw new Error('Emotion Engine returned an empty or invalid segments array');
    }

    return parsed;
  }

  static async narrate(
    request: EmotionEngineNarrateRequest,
    options?: { timeoutMs?: number }
  ): Promise<EmotionEngineNarrateResponse> {
    const config = getEmotionEngineConfig();
    if (!config.enabled) {
      throw new Error('EMOTION_ENGINE_DISABLED: Emotion Engine is disabled (EMOTION_ENGINE_ENABLED=false).');
    }

    const textLength = request.segments.reduce((sum, seg) => sum + seg.text.length, 0);
    const timeoutMs =
      options?.timeoutMs ??
      computeNarrateTimeoutMs({
        textLength,
        segmentCount: request.segments.length,
        config,
      });

    const body = JSON.stringify({
      segments: request.segments,
      language: request.language,
      narrator_role: request.narrator_role,
      job_id: request.job_id,
      character_map: request.character_map,
    });

    const res = await httpRequest(`${config.url}/narrate`, 'POST', body, timeoutMs);

    if (res.status !== 200) {
      throw new Error(`Emotion Engine /narrate returned HTTP ${res.status}: ${res.body.substring(0, 300)}`);
    }

    const parsed: EmotionEngineNarrateResponse = JSON.parse(res.body);
    if (!parsed.audio_url) {
      throw new Error('Emotion Engine /narrate returned an invalid response (missing audio_url)');
    }

    return parsed;
  }
}
