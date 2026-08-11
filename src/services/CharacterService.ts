import { AIProviderManager } from '../ai/AIProviderManager';
import { CharacterItem, CharacterVisualItem } from '../types';

export class CharacterService {
  private visualBibleStore: Map<string, CharacterVisualItem> = new Map();
  private characterStore: Map<string, CharacterItem> = new Map();

  constructor(private aiManager: AIProviderManager) {}

  async extractCharacters(scriptText: string): Promise<CharacterItem[]> {
    const characters = await this.aiManager.extractCharacters(scriptText);
    for (const char of characters) {
      if (char.id) {
        this.characterStore.set(char.id, char);
      }
    }
    return characters;
  }

  async generateVisualBible(characterId: string, customTrait?: string): Promise<CharacterVisualItem> {
    console.log(`[CharacterService] Generating Character Visual Bible for character '${characterId}'`);

    const character = this.characterStore.get(characterId) || {
      id: characterId,
      name: 'Protagonist',
      role: 'Lead',
      ageGroup: 'YOUNG_ADULT',
      genderPresentation: 'FEMALE',
      personality: 'Brave, empathetic, resilient',
      appearance: customTrait || 'Striking eyes, expressive posture',
      importance: 'HIGH',
      confidence: 0.95
    };

    const visual = await this.aiManager.generateCharacterVisuals(character);
    visual.characterId = characterId;

    this.visualBibleStore.set(characterId, visual);
    return visual;
  }

  async getVisualBible(characterId: string): Promise<CharacterVisualItem> {
    if (this.visualBibleStore.has(characterId)) {
      return this.visualBibleStore.get(characterId)!;
    }
    return this.generateVisualBible(characterId);
  }

  async updateAvatarAndSeed(characterId: string, seed: number, avatarUrl?: string, clothingStyle?: string): Promise<CharacterVisualItem> {
    const existing = await this.getVisualBible(characterId);
    const updated: CharacterVisualItem = {
      ...existing,
      seed,
      avatarUrl: avatarUrl || existing.avatarUrl,
      clothingStyle: clothingStyle || existing.clothingStyle,
      turnaroundPrompt: `${existing.turnaroundPrompt} Locked seed ${seed}.`
    };

    this.visualBibleStore.set(characterId, updated);
    return updated;
  }
}
