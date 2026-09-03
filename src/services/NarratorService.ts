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
        const normalizedTitle = contentInfo.title.toLowerCase().trim();
        const contentId = contentInfo.title;
        await prismaService.contentSource.upsert({
          where: { normalizedTitle },
          update: { title: contentId },
          create: {
            id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: contentId,
            normalizedTitle,
            contentType: normalizeContentType(contentInfo.contentType),
            rightsStatus: 'PUBLIC_DOMAIN'
          }
        });
        const persistedSource = await prismaService.contentSource.findUnique({ where: { normalizedTitle } });
        const resolvedContentId = persistedSource?.id || contentId;

        await prismaService.narratorProfile.create({
          data: {
            contentSourceId: resolvedContentId,
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
