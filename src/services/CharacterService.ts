import { AIProviderManager } from '../ai/AIProviderManager';
import { CharacterItem, CharacterVisualItem } from '../types';
import { prismaService } from '../database/prisma/prisma.service';

export class CharacterService {
  private visualBibleStore: Map<string, CharacterVisualItem> = new Map();
  private characterStore: Map<string, CharacterItem> = new Map();

  constructor(private aiManager: AIProviderManager) {}

  async extractCharacters(scriptText: string): Promise<CharacterItem[]> {
    const characters = await this.aiManager.extractCharacters(scriptText);
    for (const char of characters) {
      if (char.id) {
        this.characterStore.set(char.id, char);
        if (prismaService.isAvailable) {
          try {
            await prismaService.character.upsert({
              where: { id: char.id },
              update: {
                name: char.name,
                role: char.role,
                personality: char.personality,
                appearance: char.appearance
              },
              create: {
                id: char.id,
                contentSourceId: char.id,
                name: char.name,
                role: char.role,
                ageGroup: char.ageGroup || 'YOUNG_ADULT',
                genderPresentation: char.genderPresentation || 'FEMALE',
                personality: char.personality,
                appearance: char.appearance,
                importance: char.importance || 'HIGH',
                confidence: char.confidence || 0.95
              }
            });
          } catch {
            // In-memory fallback
          }
        }
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

    if (prismaService.isAvailable) {
      try {
        await prismaService.characterVisual.upsert({
          where: { id: visual.id || characterId },
          update: {
            seed: visual.seed,
            avatarUrl: visual.avatarUrl,
            clothingStyle: visual.clothingStyle,
            consistencyScore: visual.consistencyScore
          },
          create: {
            id: visual.id || characterId,
            characterId,
            seed: visual.seed,
            turnaroundPrompt: visual.turnaroundPrompt,
            avatarUrl: visual.avatarUrl,
            clothingStyle: visual.clothingStyle,
            consistencyScore: visual.consistencyScore
          }
        });
      } catch {
        // In-memory fallback
      }
    }

    return visual;
  }

  async getVisualBible(characterId: string): Promise<CharacterVisualItem> {
    if (prismaService.isAvailable) {
      try {
        const dbVisual = await prismaService.characterVisual.findFirst({
          where: { characterId }
        });
        if (dbVisual) {
          return {
            id: dbVisual.id,
            characterId: dbVisual.characterId,
            seed: dbVisual.seed,
            faceEmbedding: dbVisual.faceEmbedding ? JSON.parse(dbVisual.faceEmbedding) : undefined,
            turnaroundPrompt: dbVisual.turnaroundPrompt,
            avatarUrl: dbVisual.avatarUrl || undefined,
            clothingStyle: dbVisual.clothingStyle,
            consistencyScore: dbVisual.consistencyScore
          };
        }
      } catch {
        // In-memory fallback
      }
    }

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

    if (prismaService.isAvailable) {
      try {
        await prismaService.characterVisual.update({
          where: { id: existing.id || characterId },
          data: {
            seed,
            avatarUrl: updated.avatarUrl,
            clothingStyle: updated.clothingStyle,
            turnaroundPrompt: updated.turnaroundPrompt
          }
        });
      } catch {
        // In-memory fallback
      }
    }

    return updated;
  }
}
