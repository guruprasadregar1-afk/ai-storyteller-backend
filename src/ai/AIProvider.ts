import { ClassifyResult, ScriptGenerationParams, ScriptResult, CharacterItem, VoiceProfileResult, SceneBeatItem, CharacterVisualItem, ContentType } from '../types';
import { ResearchResult } from '../services/ResearchService';

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;

  classifyContent(input: string): Promise<ClassifyResult>;
  researchContent(query: string, contentType?: ContentType): Promise<ResearchResult>;
  resolveContent(input: string, candidates: string[]): Promise<{ canonicalTitle: string; confidence: number; contentType: ContentType }>;
  generateStoryScript(title: string, facts: string[], params: ScriptGenerationParams, researchData?: ResearchResult): Promise<ScriptResult>;
  segmentScript(scriptText: string): Promise<SceneBeatItem[]>;
  extractCharacters(scriptOrFacts: string): Promise<CharacterItem[]>;
  generateCharacterVisuals(character: CharacterItem): Promise<CharacterVisualItem>;
  selectNarrator(contentInfo: { title: string; contentType: string; genre?: string }, script: string, characters: CharacterItem[]): Promise<VoiceProfileResult>;

  /**
   * Translates a single paragraph of narration text into targetLanguageName ("Hindi", "Spanish", etc.),
   * identified by ISO code targetLanguageCode ("hi", "es", etc.). Must return a REAL, complete,
   * fully-translated paragraph from a live model call -- never a template, dictionary substitution,
   * or partial/summarized translation.
   */
  translateText(text: string, targetLanguageCode: string, targetLanguageName: string): Promise<{ translatedText: string; model: string }>;
}