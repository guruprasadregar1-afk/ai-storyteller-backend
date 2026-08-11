import { AIProviderManager } from '../ai/AIProviderManager';
import { RightsService } from './RightsService';
import { ScriptGenerationParams, ScriptResult, ContentType } from '../types';
import { prismaService } from '../database/prisma/prisma.service';

export class ScriptService {
  constructor(
    private aiManager: AIProviderManager,
    private rightsService: RightsService
  ) {}

  async generateScript(
    title: string,
    contentType: ContentType,
    facts: string[],
    params: ScriptGenerationParams
  ): Promise<ScriptResult> {
    const rightsCheck = this.rightsService.evaluateRights(contentType, title);
    if (!rightsCheck.allowed) {
      throw new Error(`Rights restriction: ${rightsCheck.reason}`);
    }

    const scriptResult = await this.aiManager.generateStoryScript(title, facts, params);

    // Enforce rights mode & quality check
    scriptResult.rightsMode = rightsCheck.rightsMode;

    // Persist script to Prisma DB
    if (prismaService.isAvailable) {
      try {
        const contentId = title;
        await prismaService.contentSource.upsert({
          where: { id: contentId },
          update: {},
          create: {
            id: contentId,
            title: title,
            normalizedTitle: title.toLowerCase().trim(),
            contentType: contentType || 'MOVIE',
            rightsStatus: 'PUBLIC_DOMAIN'
          }
        });

        const scriptId = `script-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        await prismaService.storytellingScript.create({
          data: {
            id: scriptId,
            contentSourceId: contentId,
            mode: params.mode || 'FULL_STORY',
            language: 'English',
            script: scriptResult.script,
            model: scriptResult.model,
            provider: scriptResult.provider,
            rightsMode: scriptResult.rightsMode,
            qualityScore: scriptResult.qualityScore || 1.0
          }
        });
        console.log(`[ScriptService] Persisted generated script '${scriptId}' to Prisma Database.`);
      } catch (err) {
        console.warn(`[ScriptService] Database persist warning:`, err);
      }
    }

    return scriptResult;
  }
}
