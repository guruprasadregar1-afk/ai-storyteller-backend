import { ClassifyResult, ScriptGenerationParams, ScriptResult, CharacterItem, VoiceProfileResult } from '../types';

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;

  classifyContent(input: string): Promise<ClassifyResult>;
  resolveContent(input: string, candidates: string[]): Promise<{ canonicalTitle: string; confidence: number; contentType: ContentType }>;
  generateStoryScript(title: string, facts: string[], params: ScriptGenerationParams): Promise<ScriptResult>;
  extractCharacters(scriptOrFacts: string): Promise<CharacterItem[]>;
  selectNarrator(contentInfo: { title: string; contentType: string; genre?: string }, script: string, characters: CharacterItem[]): Promise<VoiceProfileResult>;
}

type ContentType = 'MOVIE' | 'BOOK' | 'STORY' | 'HISTORY' | 'FOLKLORE' | 'USER_CONTEXT';
