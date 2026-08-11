import { AIProviderManager } from '../ai/AIProviderManager';
import { CharacterItem, VoiceProfileResult } from '../types';

export class NarratorService {
  constructor(private aiManager: AIProviderManager) {}

  async selectNarrator(
    contentInfo: { title: string; contentType: string; genre?: string },
    script: string,
    characters: CharacterItem[]
  ): Promise<VoiceProfileResult> {
    return this.aiManager.selectNarrator(contentInfo, script, characters);
  }
}
