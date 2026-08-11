import { AIProvider } from './AIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { ClassifyResult, ScriptGenerationParams, ScriptResult, CharacterItem, VoiceProfileResult, SceneBeatItem, CharacterVisualItem } from '../types';

export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProviderName: string;

  constructor() {
    const claude = new ClaudeProvider();
    const gemini = new GeminiProvider();
    const groq = new GroqProvider();

    this.providers.set('claude', claude);
    this.providers.set('gemini', gemini);
    this.providers.set('groq', groq);

    this.defaultProviderName = process.env.AI_DEFAULT_PROVIDER || 'claude';
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
    console.log(`[AIProviderManager] No active external LLM key found; using Claude provider (Development Mode)`);
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

  async generateStoryScript(title: string, facts: string[], params: ScriptGenerationParams): Promise<ScriptResult> {
    const provider = await this.getHealthyProvider();
    return provider.generateStoryScript(title, facts, params);
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
}
