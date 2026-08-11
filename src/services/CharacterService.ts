import { AIProviderManager } from '../ai/AIProviderManager';
import { CharacterItem } from '../types';

export class CharacterService {
  constructor(private aiManager: AIProviderManager) {}

  async extractCharacters(scriptText: string): Promise<CharacterItem[]> {
    return this.aiManager.extractCharacters(scriptText);
  }
}
