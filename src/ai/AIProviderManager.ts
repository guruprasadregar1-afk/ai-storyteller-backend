import { AIProvider } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { ClassifyResult, ScriptGenerationParams, ScriptResult, CharacterItem, VoiceProfileResult, SceneBeatItem, CharacterVisualItem, ContentType } from '../types';
import { ResearchResult } from '../services/ResearchService';
import { resolveTranslationProviderOrder } from './aiModelConfig';

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProviderName: string;

  constructor() {
    const claude = new ClaudeProvider();
    const gemini = new GeminiProvider();
    const groq = new GroqProvider();

    // Order matters for fallback: groq → gemini → claude
    // Groq is listed first because it has higher daily limits (14,400 req/day vs Gemini's 20/day free tier)
    this.providers.set('groq', groq);
    this.providers.set('gemini', gemini);
    this.providers.set('claude', claude);

    this.defaultProviderName = process.env.AI_DEFAULT_PROVIDER || 'groq';
  }

  async getHealthyProvider(): Promise<AIProvider> {
    const preferred = this.providers.get(this.defaultProviderName.toLowerCase());
    if (preferred && (await preferred.isAvailable())) {
      return preferred;
    }

    for (const [name, provider] of this.providers.entries()) {
      if (await provider.isAvailable()) {
        console.log(`[AIProviderManager] Fallback activated: using provider '${name}' instead of '${this.defaultProviderName}'`);
        return provider;
      }
    }

    // Default mock fallback provider if no API keys configured in dev
    return this.providers.get('claude')!;
  }

  async getHealthStatus() {
    const status: Record<string, boolean> = {};
    for (const [name, provider] of this.providers.entries()) {
      status[name] = await provider.isAvailable();
    }
    return {
      providers: status,
      defaultProvider: this.defaultProviderName,
      activeProvider: (await this.getHealthyProvider()).name
    };
  }

  async classifyContent(input: string): Promise<ClassifyResult> {
    const provider = await this.getHealthyProvider();
    return provider.classifyContent(input);
  }

  async researchContent(query: string, contentType?: ContentType): Promise<ResearchResult> {
    const provider = await this.getHealthyProvider();
    return provider.researchContent(query, contentType);
  }

  async generateStoryScript(title: string, facts: string[], params: ScriptGenerationParams, researchData?: ResearchResult): Promise<ScriptResult> {
    const provider = await this.getHealthyProvider();
    return provider.generateStoryScript(title, facts, params, researchData);
  }

  async segmentScript(scriptText: string): Promise<SceneBeatItem[]> {
    const provider = await this.getHealthyProvider();
    return provider.segmentScript(scriptText);
  }

  async extractCharacters(scriptOrFacts: string): Promise<CharacterItem[]> {
    const provider = await this.getHealthyProvider();
    return provider.extractCharacters(scriptOrFacts);
  }

  async generateCharacterVisuals(character: CharacterItem): Promise<CharacterVisualItem> {
    const provider = await this.getHealthyProvider();
    return provider.generateCharacterVisuals(character);
  }

  async selectNarrator(contentInfo: { title: string; contentType: string; genre?: string }, script: string, characters: CharacterItem[]): Promise<VoiceProfileResult> {
    const provider = await this.getHealthyProvider();
    return provider.selectNarrator(contentInfo, script, characters);
  }

  /**
   * Translates a single paragraph using a real, live model call. Tries the preferred/default
   * provider first; if it's unavailable or the call fails (quota, network, etc.), falls through
   * to the next available provider rather than silently returning untranslated/fake content.
   */
  async translateText(text: string, targetLanguageCode: string, targetLanguageName: string): Promise<{ translatedText: string; model: string; provider: string }> {
    const order = resolveTranslationProviderOrder(this.defaultProviderName);
    const orderedProviders: AIProvider[] = [];
    for (const name of order) {
      const provider = this.providers.get(name);
      if (provider && !orderedProviders.includes(provider)) {
        orderedProviders.push(provider);
      }
    }
    for (const provider of this.providers.values()) {
      if (!orderedProviders.includes(provider)) orderedProviders.push(provider);
    }

    let lastError: Error | null = null;
    for (const provider of orderedProviders) {
      try {
        if (!(await provider.isAvailable())) continue;
        const result = await provider.translateText(text, targetLanguageCode, targetLanguageName);
        return { ...result, provider: provider.name };
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIProviderManager] translateText failed on provider '${provider.name}': ${err.message}. Trying next provider...`);
      }
    }

    throw new Error(`No AI provider could complete translation. Last error: ${lastError?.message || 'no providers available'}`);
  }
}