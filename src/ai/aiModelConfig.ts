/**
 * Shared AI model IDs and env overrides.
 * Groq retired llama-3.3-70b-versatile on 2026-08-16; see console.groq.com/docs/deprecations
 */

export function resolveGroqModel(): string {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
}

export function resolveGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
}

/** Anthropic model for Claude provider (translation fallback and primary generation). */
export function resolveClaudeModel(): string {
  return process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';
}

/** Provider order for translation — Claude/Groq before Gemini to avoid free-tier RPM limits. */
export function resolveTranslationProviderOrder(defaultProvider: string): string[] {
  const fromEnv = process.env.AI_TRANSLATION_PROVIDER_ORDER;
  if (fromEnv?.trim()) {
    return fromEnv.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  const ordered = ['claude', 'groq', 'gemini'];
  const preferred = defaultProvider.toLowerCase();
  if (preferred && ordered.includes(preferred) && ordered[0] !== preferred) {
    return [preferred, ...ordered.filter((p) => p !== preferred)];
  }
  return ordered;
}

export function translationParagraphDelayMs(): number {
  const raw = process.env.TRANSLATION_PARAGRAPH_DELAY_MS;
  if (raw === undefined || raw.trim() === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Max concurrent paragraph translation API requests (rate-limit safe). */
export function translationCloudConcurrency(): number {
  const raw = process.env.TRANSLATION_CLOUD_CONCURRENCY ?? process.env.TRANSLATION_CONCURRENCY;
  if (raw === undefined || raw.trim() === '') return 3;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 4) : 3;
}

/** @deprecated Use translationCloudConcurrency. */
export function translationConcurrency(): number {
  return translationCloudConcurrency();
}

export function isRetryableProviderError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('429') ||
    m.includes('503') ||
    m.includes('too many requests') ||
    m.includes('quota') ||
    m.includes('high demand') ||
    m.includes('rate limit')
  );
}

export function retryDelayMsFromError(message: string, attempt: number): number {
  const retryMatch = message.match(/retry(?: in| after)?\s*(?:\[)?(\d+(?:\.\d+)?)\s*s/i);
  if (retryMatch) {
    return Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
  }
  // Free-tier Gemini: 5 RPM → ~12s spacing; exponential backoff on repeated failures.
  return Math.min(32000, 8000 * attempt);
}
