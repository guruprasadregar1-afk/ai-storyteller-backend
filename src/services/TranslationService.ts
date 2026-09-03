import { AIProviderManager } from '../ai/AIProviderManager';
import { translationCloudConcurrency, translationParagraphDelayMs } from '../ai/aiModelConfig';
import { mapWithConcurrency } from '../common/utils/parallelPool';
import { TranslationResult } from '../types';
import { getLanguageConfig } from '../config/language.config';
import { LanguageValidationService } from './LanguageValidationService';

export interface TranslationRunStats {
  paragraphCount: number;
  paragraphRetries: number;
  templateOpenerRejections: number;
  fullStoryRetries: number;
  totalParagraphAttempts: number;
  perParagraphLatencyMs: number[];
  parallelConcurrency: number;
  wallTimeMs: number;
}

export class TranslationService {
  private translationCache = new Map<string, TranslationResult>();
  private lastRunStats: TranslationRunStats | null = null;

  constructor(private aiManager: AIProviderManager) {}

  getLastRunStats(): TranslationRunStats | null {
    return this.lastRunStats;
  }

  /**
   * Translates the entire canonical story script into the requested target language.
   */
  async translateStory(
    scriptId: string,
    text: string,
    targetLanguage: string,
    sourceLanguage = 'en'
  ): Promise<TranslationResult> {
    const targetConfig = getLanguageConfig(targetLanguage);
    if (targetConfig.code === sourceLanguage.toLowerCase() || targetConfig.code === 'en') {
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage: targetConfig.code,
        provider: 'identity',
        model: 'identity-v1',
        confidence: 1.0,
        preservedStructure: true,
      };
    }

    const scriptHash = this.hashText(text);
    const cacheKey = `${scriptId}:${targetConfig.code}:${scriptHash}`;

    if (this.translationCache.has(cacheKey)) {
      const cached = this.translationCache.get(cacheKey)!;
      const validation = LanguageValidationService.validateTextLanguage(cached.translatedText, targetConfig.code);

      if (validation.isValid) {
        console.log(`[TranslationService] Cache hit for script '${scriptId}' -> '${targetConfig.name}' (purity: ${validation.scriptPurity}).`);
        return cached;
      }
      console.warn(`[TranslationService] Evicting corrupted cached translation for '${scriptId}': ${validation.reason}`);
      this.translationCache.delete(cacheKey);
    }

    const origWordCount = text.split(/\s+/).filter(Boolean).length;
    console.log(`[TranslationService] Translating '${scriptId}' (${origWordCount} words) into '${targetConfig.name}' via API…`);

    const MAX_FULL_RETRIES = 2;
    let lastError = '';
    const wallStart = Date.now();

    for (let attempt = 1; attempt <= MAX_FULL_RETRIES; attempt++) {
      try {
        const { translatedText, stats } = await this.translateFullScriptParagraphs(
          text,
          targetConfig.code,
          targetConfig.name
        );
        stats.fullStoryRetries = attempt - 1;
        stats.wallTimeMs = Date.now() - wallStart;

        const validation = LanguageValidationService.validateTextLanguage(translatedText, targetConfig.code);

        if (validation.isValid) {
          const transWordCount = translatedText.split(/\s+/).filter(Boolean).length;
          console.log(
            `[TranslationService] PASS attempt ${attempt}/${MAX_FULL_RETRIES} ` +
              `(words ${origWordCount}->${transWordCount}, purity ${validation.scriptPurity}, ` +
              `paragraphRetries=${stats.paragraphRetries}, templateOpenerRejections=${stats.templateOpenerRejections}, ` +
              `wall=${stats.wallTimeMs}ms, concurrency=${stats.parallelConcurrency})`
          );

          this.lastRunStats = stats;

          const result: TranslationResult = {
            translatedText,
            sourceLanguage,
            targetLanguage: targetConfig.code,
            provider: 'ai-provider-translator',
            model: 'live-llm-paragraph-translation',
            confidence: 0.95,
            preservedStructure: true,
          };

          this.translationCache.set(cacheKey, result);
          return result;
        }

        lastError = validation.reason || 'Translation failed language purity check';
        if (lastError.includes('HARDCODED_TEMPLATE_OPENER_DETECTED')) {
          stats.templateOpenerRejections += 1;
        }
        console.warn(`[TranslationService] Attempt ${attempt}/${MAX_FULL_RETRIES} REJECTED: ${lastError}`);
      } catch (err: any) {
        lastError = err.message || 'Translation execution error';
        console.warn(`[TranslationService] Attempt ${attempt}/${MAX_FULL_RETRIES} FAILED: ${lastError}`);
      }
    }

    throw new Error(`TRANSLATION_FAILED: Unable to translate story '${scriptId}' into '${targetConfig.name}' after ${MAX_FULL_RETRIES} attempts. Cause: ${lastError}`);
  }

  /**
   * Translate all paragraphs in parallel (bounded concurrency). Preserves paragraph order.
   */
  private async translateFullScriptParagraphs(
    fullScript: string,
    langCode: string,
    langName: string
  ): Promise<{ translatedText: string; stats: TranslationRunStats }> {
    const paragraphs = fullScript.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const concurrency = translationCloudConcurrency();
    const delayMs = translationParagraphDelayMs();

    const stats: TranslationRunStats = {
      paragraphCount: paragraphs.length,
      paragraphRetries: 0,
      templateOpenerRejections: 0,
      fullStoryRetries: 0,
      totalParagraphAttempts: 0,
      perParagraphLatencyMs: [],
      parallelConcurrency: concurrency,
      wallTimeMs: 0,
    };

    const translatedParagraphs = await mapWithConcurrency(
      paragraphs,
      concurrency,
      async (pText, index) => {
        const start = Date.now();
        const { text, attempts, templateRejections } = await this.translateParagraphWithRetry(
          pText.trim(),
          langCode,
          langName,
          index + 1,
          paragraphs.length
        );
        stats.perParagraphLatencyMs[index] = Date.now() - start;
        stats.totalParagraphAttempts += attempts;
        stats.paragraphRetries += Math.max(0, attempts - 1);
        stats.templateOpenerRejections += templateRejections;
        if (delayMs > 0 && index < paragraphs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return text;
      }
    );

    return { translatedText: translatedParagraphs.join('\n\n'), stats };
  }

  private async translateParagraphWithRetry(
    pText: string,
    langCode: string,
    langName: string,
    pIdx: number,
    totalP: number
  ): Promise<{ text: string; attempts: number; templateRejections: number }> {
    const MAX_PARAGRAPH_RETRIES = 3;
    let lastError = '';
    let templateRejections = 0;

    for (let attempt = 1; attempt <= MAX_PARAGRAPH_RETRIES; attempt++) {
      try {
        const { translatedText } = await this.aiManager.translateText(pText, langCode, langName);
        const validation = LanguageValidationService.validateTextLanguage(translatedText, langCode);

        if (validation.isValid) {
          return { text: translatedText, attempts: attempt, templateRejections };
        }

        lastError = validation.reason || 'Paragraph failed language validation';
        if (lastError.includes('HARDCODED_TEMPLATE_OPENER_DETECTED')) {
          templateRejections += 1;
        }
        console.warn(`[TranslationService] Paragraph ${pIdx}/${totalP} attempt ${attempt}/${MAX_PARAGRAPH_RETRIES} REJECTED: ${lastError}`);
      } catch (err: any) {
        lastError = err.message || 'Paragraph translation call failed';
        console.warn(`[TranslationService] Paragraph ${pIdx}/${totalP} attempt ${attempt}/${MAX_PARAGRAPH_RETRIES} FAILED: ${lastError}`);
      }
    }

    throw new Error(`Paragraph ${pIdx}/${totalP} could not be translated into '${langName}' after ${MAX_PARAGRAPH_RETRIES} attempts. Cause: ${lastError}`);
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
