import { AIProviderManager } from '../ai/AIProviderManager';
import { CharacterItem, VoiceProfileResult } from '../types';
import { prismaService } from '../database/prisma/prisma.service';
import { normalizeContentType } from '../common/utils/content-type.util';

export class NarratorService {
  constructor(private aiManager: AIProviderManager) {}

  async selectNarrator(
    contentInfo: { title: string; contentType: string; genre?: string },
    script: string,
    characters: CharacterItem[]
  ): Promise<VoiceProfileResult> {
    const narrator = await this.aiManager.selectNarrator(contentInfo, script, characters);

    if (prismaService.isAvailable) {
      try {
        const contentId = contentInfo.title;
        await prismaService.contentSource.upsert({
          where: { id: contentId },
          update: {},
          create: {
            id: contentId,
            title: contentInfo.title,
            normalizedTitle: contentInfo.title.toLowerCase().trim(),
            contentType: normalizeContentType(contentInfo.contentType),
            rightsStatus: 'PUBLIC_DOMAIN'
          }
        });

        await prismaService.narratorProfile.create({
          data: {
            contentSourceId: contentId,
            ageGroup: narrator.ageGroup,
            genderPresentation: narrator.genderPresentation,
            tone: narrator.tone,
            emotion: narrator.emotion,
            pace: narrator.pace,
            language: narrator.language || 'English',
            accent: narrator.accent || 'Neutral',
            style: narrator.style,
            audience: narrator.audience,
            reasoning: narrator.reasoning,
            confidence: narrator.confidence || 1.0,
            selectedProvider: narrator.selectedProvider,
            selectedModel: narrator.selectedModel
          }
        });
      } catch (err) {
        console.warn(`[NarratorService] Database persist warning:`, err);
      }
    }

    return narrator;
  }
}
