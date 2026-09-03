import { AIProviderManager } from '../ai/AIProviderManager';
import { RightsService } from './RightsService';
import { normalizeContentType } from '../common/utils/content-type.util';
import { ScriptGenerationParams, ScriptResult, ContentType, NarrationPath } from '../types';
import { prismaService } from '../database/prisma/prisma.service';
import { ResearchResult } from './ResearchService';
import { storyValidator } from './StoryValidator';
import {
  countAttributedDialogueLines,
  MIN_DIALOGUE_LINES_FOR_MULTI_VOICE,
  prefersNarratorOnlyNarration,
  shouldRequireMultiVoiceDialogue,
} from '../common/utils/story-dialogue-guidance';
import { validateStoryGrounding } from '../common/utils/story-grounding.util';

export class ScriptService {
  constructor(
    private aiManager: AIProviderManager,
    private rightsService: RightsService
  ) {}

  async generateScript(
    title: string,
    contentType: ContentType,
    facts: string[],
    params: ScriptGenerationParams,
    researchData?: ResearchResult
  ): Promise<ScriptResult> {
    const rightsCheck = this.rightsService.evaluateRights(contentType, title);
    if (!rightsCheck.allowed) {
      throw new Error(`Rights restriction: ${rightsCheck.reason}`);
    }

    const resolvedType = researchData?.contentType || contentType;
    const narratorOnlyFromStart = prefersNarratorOnlyNarration(resolvedType, params);
    const maxAttempts = 3;
    let attempts = 0;
    let scriptResult: ScriptResult | null = null;
    let bestValidLowDialogue: ScriptResult | null = null;
    let bestDialogueCount = -1;

    const baseParams: ScriptGenerationParams = {
      ...params,
      requireMultiVoiceDialogue: narratorOnlyFromStart ? false : params.requireMultiVoiceDialogue,
    };

    if (narratorOnlyFromStart) {
      console.log(
        `[ScriptService] Content type '${resolvedType}' → narrator-only generation from start (no multi-voice dialogue requirement).`
      );
    } else {
      console.log(`[ScriptService] Content type '${resolvedType}' → multi-voice dialogue preferred for '${title}'.`);
    }

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[ScriptService] Generating story script attempt ${attempts}/${maxAttempts} for '${title}'...`);

      const candidate = await this.aiManager.generateStoryScript(title, facts, baseParams, researchData);
      const validation = storyValidator.validateStory(candidate.script, params.mode || 'STANDARD');
      const dialogueLines = countAttributedDialogueLines(candidate.script);

      if (!validation.valid) {
        console.warn(`[ScriptService] Attempt ${attempts} story validation failed: ${validation.issues.join(', ')}`);
        continue;
      }

      if (researchData?.grounded && (researchData.facts?.length || 0) >= 3) {
        const grounding = validateStoryGrounding(candidate.script, researchData);
        if (!grounding.valid) {
          console.warn(
            `[ScriptService] Attempt ${attempts} failed title grounding for '${title}': ${grounding.issues.join(', ')}`
          );
          continue;
        }
      }

      const needsMoreDialogue =
        shouldRequireMultiVoiceDialogue(resolvedType, baseParams) &&
        dialogueLines < MIN_DIALOGUE_LINES_FOR_MULTI_VOICE;

      if (!needsMoreDialogue) {
        const narrationPath: NarrationPath = narratorOnlyFromStart || dialogueLines < MIN_DIALOGUE_LINES_FOR_MULTI_VOICE
          ? 'narrator-only'
          : 'multi-voice';
        scriptResult = { ...candidate, narrationPath };
        console.log(
          `[ScriptService] Attempt ${attempts} accepted (${narrationPath} path, ${dialogueLines} attributed dialogue lines).`
        );
        break;
      }

      if (dialogueLines > bestDialogueCount) {
        bestDialogueCount = dialogueLines;
        bestValidLowDialogue = candidate;
      }

      console.warn(
        `[ScriptService] Attempt ${attempts} has too few attributed dialogue lines (${dialogueLines}); retrying for multi-voice narration.`
      );
    }

    if (!scriptResult && bestValidLowDialogue) {
      const dialogueLines = countAttributedDialogueLines(bestValidLowDialogue.script);
      scriptResult = { ...bestValidLowDialogue, narrationPath: 'narrator-only' };
      console.warn(
        `[ScriptService] Multi-voice dialogue not achieved after ${maxAttempts} attempts. ` +
          `Accepting best valid story (${dialogueLines} dialogue lines) → narrator-only fallback.`
      );
    }

    if (!scriptResult) {
      console.log(`[ScriptService] Explicit narrator-only generation attempt for '${title}'...`);
      const fallbackCandidate = await this.aiManager.generateStoryScript(
        title,
        facts,
        { ...params, requireMultiVoiceDialogue: false },
        researchData
      );
      const fallbackValidation = storyValidator.validateStory(fallbackCandidate.script, params.mode || 'STANDARD');
      const fallbackGrounding =
        researchData?.grounded && (researchData.facts?.length || 0) >= 3
          ? validateStoryGrounding(fallbackCandidate.script, researchData)
          : { valid: true, issues: [] as string[] };
      if (fallbackValidation.valid && fallbackGrounding.valid) {
        const dialogueLines = countAttributedDialogueLines(fallbackCandidate.script);
        scriptResult = { ...fallbackCandidate, narrationPath: 'narrator-only' };
        console.log(
          `[ScriptService] Narrator-only fallback generation succeeded (${dialogueLines} attributed dialogue lines).`
        );
      } else {
        const failureReasons = [
          ...fallbackValidation.issues,
          ...fallbackGrounding.issues,
        ].filter(Boolean);
        console.warn(
          `[ScriptService] Narrator-only fallback failed: ${failureReasons.join(', ') || 'validation or grounding check failed'}`
        );
      }
    }

    if (!scriptResult) {
      throw new Error(
        `STORY_GENERATION_FAILED: Failed to generate a valid, title-grounded story for "${title}" after ${maxAttempts} attempts and narrator-only fallback.`
      );
    }

    const finalDialogueLines = countAttributedDialogueLines(scriptResult.script);
    console.log(
      `[ScriptService] Story ready for '${title}' via ${scriptResult.narrationPath} path ` +
        `(${finalDialogueLines} attributed dialogue lines, ${scriptResult.script.split(/\s+/).filter(Boolean).length} words).`
    );

    scriptResult.rightsMode = rightsCheck.rightsMode;

    if (prismaService.isAvailable) {
      try {
        const normalizedTitle = title.toLowerCase().trim();
        const contentId = title;
        await prismaService.contentSource.upsert({
          where: { normalizedTitle },
          update: { title: contentId },
          create: {
            id: `cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: contentId,
            normalizedTitle,
            contentType: normalizeContentType(contentType),
            rightsStatus: 'PUBLIC_DOMAIN',
          },
        });
        const persistedSource = await prismaService.contentSource.findUnique({ where: { normalizedTitle } });
        const resolvedContentId = persistedSource?.id || contentId;

        const scriptId = `script-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        await prismaService.storytellingScript.create({
          data: {
            id: scriptId,
            contentSourceId: resolvedContentId,
            mode: params.mode || 'FULL_STORY',
            language: 'English',
            script: scriptResult.script,
            model: scriptResult.model,
            provider: scriptResult.provider,
            rightsMode: scriptResult.rightsMode,
            qualityScore: scriptResult.qualityScore || 1.0,
          },
        });
        console.log(`[ScriptService] Persisted generated script '${scriptId}' to Prisma Database.`);
      } catch (err) {
        console.warn(`[ScriptService] Database persist warning:`, err);
      }
    }

    return scriptResult;
  }
}
