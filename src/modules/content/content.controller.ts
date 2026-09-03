import { Request, Response } from 'express';
import { ContentService } from '../../services/ContentService';
import { ResearchService } from '../../services/ResearchService';
import { ScriptService } from '../../services/ScriptService';
import { RightsService } from '../../services/RightsService';
import { CharacterService } from '../../services/CharacterService';
import { NarratorService } from '../../services/NarratorService';
import { storyAudioService } from '../../services/StoryAudioService';
import { TranslationService } from '../../services/TranslationService';
import { pipelineJobService } from '../../services/PipelineJobService';
import { emotionAnalysisService } from '../../services/EmotionAnalysisService';
import { buildEmotionEngineCharacterMap } from '../../services/emotionCharacterMap';
import { mapNarratorToVoiceRole } from '../../services/tts/EmotionEngineTTSProvider';
import { LanguageValidationService } from '../../services/LanguageValidationService';
import { buildPublicAudioResponse } from '../../common/utils/audio-response.util';
import { AIProviderManager } from '../../ai/AIProviderManager';
import { prismaService } from '../../database/prisma/prisma.service';
import { SUPPORTED_LANGUAGES, getLanguageConfig } from '../../config/language.config';

const aiManager = new AIProviderManager();
const contentService = new ContentService();
const rightsService = new RightsService();
const researchService = new ResearchService(aiManager);
const scriptService = new ScriptService(aiManager, rightsService);
const characterService = new CharacterService(aiManager);
const narratorService = new NarratorService(aiManager);
const translationService = new TranslationService(aiManager);

// Memory store for pipeline state & canonical scripts
const pipelineStateMap = new Map<string, any>();
const canonicalScriptMap = new Map<string, { title: string; contentType: any; fullScript: string; narrator: any; emotionMap: any }>();

/** Look up pipeline state by UUID or by normalized title (frontend may pass either). */
function lookupState(contentId: string): any | undefined {
  return pipelineStateMap.get(contentId) || pipelineStateMap.get(contentId.toLowerCase().trim());
}

export async function analyzeContentController(req: Request, res: Response) {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input query is required' });
    }

    const classification = await aiManager.classifyContent(input);
    const existing = await contentService.findExistingContent(input);

    let contentId = existing?.id;
    if (!contentId) {
      const saved = await contentService.saveContentRecord({
        title: classification.canonicalTitle || input,
        contentType: classification.contentType,
        description: classification.reason
      });
      contentId = saved.id;
    }

    const result = {
      contentId,
      contentType: classification.contentType,
      title: classification.canonicalTitle || input,
      confidence: classification.confidence,
      status: 'ANALYZING',
      isCached: Boolean(existing)
    };

    pipelineStateMap.set(contentId, { ...result, input });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error analyzing content' });
  }
}

export async function getLanguagesController(req: Request, res: Response) {
  return res.status(200).json({
    languages: SUPPORTED_LANGUAGES
  });
}

export async function getPipelineJobController(req: Request, res: Response) {
  const job = pipelineJobService.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  return res.status(200).json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    result: job.status === 'done' ? job.result : undefined,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

async function runTranslateAndNarrateJob(
  jobId: string,
  scriptId: string,
  fullScript: string,
  targetLangConfig: ReturnType<typeof getLanguageConfig>,
  canonicalData: any
) {
  try {
    pipelineJobService.setProgress(jobId, 'translating', 0, 1);
    const translation = await translationService.translateStory(scriptId, fullScript, targetLangConfig.code, 'en');
    const translationStats = translationService.getLastRunStats() ?? undefined;
    pipelineJobService.setProgress(jobId, 'translating', 1, 1);

    const narrationText = targetLangConfig.code === 'en' ? fullScript : translation.translatedText;
    pipelineJobService.setProgress(jobId, 'narrating', 0, 1);

    const canonicalEmotionMap =
      canonicalData.emotionMap || (await emotionAnalysisService.analyzeStoryEmotions(scriptId, fullScript, 'en'));
    const translatedEmotionMap =
      targetLangConfig.code === 'en'
        ? canonicalEmotionMap
        : emotionAnalysisService.preserveEmotionAcrossTranslation(
            canonicalEmotionMap,
            narrationText,
            targetLangConfig.code,
            fullScript
          );

    const audio = await storyAudioService.generateNarrationAudio(
      scriptId,
      narrationText,
      canonicalData.narrator,
      translatedEmotionMap,
      targetLangConfig.code
    );
    pipelineJobService.setProgress(jobId, 'narrating', 1, 1);

    const wordCount = narrationText.trim().split(/\s+/).length;
    pipelineJobService.update(jobId, {
      status: 'done',
      result: {
        translation,
        translationStats,
        narrationText,
        audio: buildPublicAudioResponse(audio, targetLangConfig.name, canonicalData.narrator?.genderPresentation),
        story: {
          fullScript: narrationText,
          wordCount,
          scriptId,
        },
        emotionMap: translatedEmotionMap,
      },
    });
  } catch (err: any) {
    pipelineJobService.update(jobId, {
      status: 'failed',
      error: err.message || 'Pipeline job failed',
    });
  }
}

export async function translateContentController(req: Request, res: Response) {
  try {
    const { scriptId, language, async: asyncMode } = req.body;
    if (!scriptId || !language) {
      return res.status(400).json({ error: 'scriptId and language parameters are required' });
    }

    const normalizedScriptId = scriptId.toLowerCase().trim();
    const canonicalData =
      canonicalScriptMap.get(scriptId) ||
      canonicalScriptMap.get(normalizedScriptId) ||
      lookupState(scriptId);
    const fullScript = canonicalData?.story?.fullScript || canonicalData?.fullScript;
    const contentObj = canonicalData?.content || { id: scriptId, title: scriptId, type: 'FOLKLORE' };

    // If still not found in memory, try DB
    if (!canonicalData || !fullScript) {
      if (prismaService.isAvailable) {
        const src = await prismaService.contentSource.findFirst({ where: { normalizedTitle: normalizedScriptId } });
        const scriptRecord = src ? await prismaService.storytellingScript.findFirst({ where: { contentSourceId: src.id }, orderBy: { createdAt: 'desc' } }) : null;
        if (scriptRecord) {
          // Re-run translation directly from DB script
          const targetLangConfig = getLanguageConfig(language);
          const dbScript = scriptRecord.script;
          const title = src!.title;
          const translation = await translationService.translateStory(scriptId, dbScript, targetLangConfig.code, 'en');
          const narrationText = targetLangConfig.code === 'en' ? dbScript : translation.translatedText;
          const dbEmotionMap = await emotionAnalysisService.analyzeStoryEmotions(scriptId, dbScript, 'en');
          const translatedEmotionMap = targetLangConfig.code === 'en' ? dbEmotionMap : emotionAnalysisService.preserveEmotionAcrossTranslation(dbEmotionMap, narrationText, targetLangConfig.code, dbScript);
          const audio = await storyAudioService.generateNarrationAudio(scriptId, narrationText, undefined, translatedEmotionMap, targetLangConfig.code);
          const wordCount = narrationText.trim().split(/\s+/).length;
          return res.status(200).json({
            status: 'READY', language: targetLangConfig,
            content: { id: src!.id, title, type: src!.contentType },
            story: { summary: narrationText.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '), fullScript: narrationText, wordCount, scriptId },
            audio: buildPublicAudioResponse(audio, targetLangConfig.name)
          });
        }
      }
      return res.status(404).json({ error: 'Canonical story script not found. Run the pipeline first.' });
    }

    const targetLangConfig = getLanguageConfig(language);
    const title = contentObj.title;

    if (asyncMode === true || asyncMode === 'true') {
      const paragraphCount = fullScript.split(/\n\s*\n/).filter((p) => p.trim()).length;
      const job = pipelineJobService.create('translate_and_narrate', paragraphCount + 1, 'queued');
      pipelineJobService.update(job.id, { status: 'processing' });
      void runTranslateAndNarrateJob(job.id, scriptId, fullScript, targetLangConfig, canonicalData);
      return res.status(202).json({
        jobId: job.id,
        status: 'queued',
        progress: job.progress,
        pollUrl: `/api/content/jobs/${job.id}`,
      });
    }

    // 1. Translate story completely before starting TTS
    const translation = await translationService.translateStory(scriptId, fullScript, targetLangConfig.code, 'en');

    // Single narrationText variable: translated text when not English, fullScript when English
    const narrationText = targetLangConfig.code === 'en' ? fullScript : translation.translatedText;

    // Validate language consistency
    const langVal = LanguageValidationService.validateTextLanguage(narrationText, targetLangConfig.code);
    if (!langVal.isValid) {
      console.warn(`[TranslateController] Narration text failed language validation for '${targetLangConfig.code}': ${langVal.reason}`);
    }

    // 2. Preserve canonical emotion map across translated text
    const canonicalEmotionMap = canonicalData.emotionMap || await emotionAnalysisService.analyzeStoryEmotions(scriptId, fullScript, 'en');
    const translatedEmotionMap = targetLangConfig.code === 'en'
      ? canonicalEmotionMap
      : emotionAnalysisService.preserveEmotionAcrossTranslation(canonicalEmotionMap, narrationText, targetLangConfig.code, fullScript);

    // 3. Synthesize emotion-aware audio strictly using narrationText
    const audio = await storyAudioService.generateNarrationAudio(
      scriptId,
      narrationText,
      canonicalData.narrator,
      translatedEmotionMap,
      targetLangConfig.code
    );

    const summarySentences = narrationText.split(/(?<=[.!?])\s+/);
    const shortSummary = summarySentences.slice(0, 2).join(' ') || `(${targetLangConfig.name}) ${title}`;
    const wordCount = narrationText.trim().split(/\s+/).length;
    const translationStats = translationService.getLastRunStats();

    return res.status(200).json({
      status: 'READY',
      language: targetLangConfig,
      content: contentObj,
      story: {
        summary: shortSummary,
        fullScript: narrationText,
        wordCount,
        scriptId,
      },
      narrator: canonicalData.narrator,
      emotionMap: translatedEmotionMap,
      translationStats,
      audio: buildPublicAudioResponse(audio, targetLangConfig.name, canonicalData.narrator?.genderPresentation),
    });
  } catch (err: any) {
    console.error('[TranslateController] Error translating story:', err);
    return res.status(500).json({ error: err.message || 'Translation failed' });
  }
}

export async function getContentController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const content = await contentService.getContentById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    return res.status(200).json({ content });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function researchContentController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const content = await contentService.getContentById(contentId);
    const title = content?.title || contentId;

    const research = await researchService.performResearch(title, content?.contentType);
    return res.status(200).json({ research });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateStoryController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const { mode } = req.body;
    const content = await contentService.getContentById(contentId);
    const title = content?.title || contentId;
    const contentType = content?.contentType || 'FOLKLORE';

    const research = await researchService.performResearch(title, contentType);
    const script = await scriptService.generateScript(title, contentType, research.facts, {
      mode: (mode as any) || 'STANDARD',
      language: 'English'
    }, research);

    return res.status(200).json({ script });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}




export async function getStoryController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const state = lookupState(contentId);
    if (state && state.story) {
      return res.status(200).json({ story: state.story });
    }
    // Fallback: look up script from DB
    if (prismaService.isAvailable) {
      const normalizedTitle = contentId.toLowerCase().trim();
      const src = await prismaService.contentSource.findFirst({ where: { normalizedTitle } });
      const scriptRecord = src ? await prismaService.storytellingScript.findFirst({ where: { contentSourceId: src.id }, orderBy: { createdAt: 'desc' } }) : null;
      if (scriptRecord) {
        return res.status(200).json({ story: { fullScript: scriptRecord.script, wordCount: scriptRecord.script.split(/\s+/).length, scriptId: scriptRecord.id } });
      }
    }
    return res.status(404).json({ error: 'Story not found for this content ID. Run the pipeline first.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getNarratorController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const state = lookupState(contentId);
    if (state && state.narrator) {
      return res.status(200).json({ narrator: state.narrator });
    }
    // Fallback: look up narrator profile from DB
    if (prismaService.isAvailable) {
      const normalizedTitle = contentId.toLowerCase().trim();
      const src = await prismaService.contentSource.findFirst({ where: { normalizedTitle } });
      const profile = src ? await prismaService.narratorProfile.findFirst({ where: { contentSourceId: src.id }, orderBy: { createdAt: 'desc' } }) : null;
      if (profile) {
        return res.status(200).json({ narrator: profile });
      }
    }
    return res.status(404).json({ error: 'Narrator not found for this content ID. Run the pipeline first to generate it.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateAudioController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const state = lookupState(contentId);
    if (!state || !state.story?.fullScript) {
      return res.status(404).json({ error: 'Story script not found for audio generation' });
    }

    const audio = await storyAudioService.generateNarrationAudio(
      contentId,
      state.story.fullScript,
      state.narrator
    );

    return res.status(200).json({ audio: buildPublicAudioResponse(audio, audio.language, state.narrator?.genderPresentation) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getResultController(req: Request, res: Response) {
  try {
    const { contentId } = req.params;
    const state = lookupState(contentId);
    if (state) {
      return res.status(200).json(state);
    }
    // Fallback: run pipeline for contentId
    const reqMock = { body: { input: contentId } } as any;
    return runFullPipelineController(reqMock, res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function runFullPipelineController(req: Request, res: Response) {
  try {
    const { input, language = 'en' } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const selectedLangConfig = getLanguageConfig(language);

    // 1. Content Classification & Database Lookup
    const classification = await aiManager.classifyContent(input);
    const canonicalTitle = classification.canonicalTitle || input.trim();

    let contentRecord = await contentService.findExistingContent(canonicalTitle);

    let research;
    if (!contentRecord) {
      // 2. Internet Research
      research = await researchService.performResearch(canonicalTitle, classification.contentType);
      contentRecord = await contentService.saveContentRecord({
        title: research.canonicalTitle || research.title,
        contentType: research.contentType,
        description: research.description,
        references: research.references
      });
    } else {
      research = await researchService.performResearch(contentRecord.title, contentRecord.contentType);
    }

    const title = contentRecord.title;
    const contentId = contentRecord.id;

    // 3. Complete Canonical Story Generation from Research & Validation
    const scriptObj = await scriptService.generateScript(title, contentRecord.contentType, research.facts, {
      mode: 'STANDARD',
      language: 'English'
    }, research);

    // 4. Character Analysis & Narrator Selection
    const characters = await characterService.extractCharacters(scriptObj.script);
    const narrator = await narratorService.selectNarrator(
      { title, contentType: contentRecord.contentType },
      scriptObj.script,
      characters
    );

    // 5. Translation completed BEFORE TTS starts
    const translation = await translationService.translateStory(contentId, scriptObj.script, selectedLangConfig.code, 'en');
    
    // Single narrationText definition
    const narrationText = selectedLangConfig.code === 'en' ? scriptObj.script : translation.translatedText;

    // Validate target language on narrationText
    const langVal = LanguageValidationService.validateTextLanguage(narrationText, selectedLangConfig.code);
    if (!langVal.isValid) {
      console.warn(`[ContentPipeline] Narration text failed language validation for '${selectedLangConfig.code}': ${langVal.reason}`);
    }

    // 6. Emotion Analysis on canonical script & preservation across narrationText
    const characterMap = buildEmotionEngineCharacterMap(
      characters,
      mapNarratorToVoiceRole(narrator)
    );
    const canonicalEmotionMap = await emotionAnalysisService.analyzeStoryEmotions(
      contentId,
      scriptObj.script,
      'en',
      { characterMap }
    );
    const activeEmotionMap = selectedLangConfig.code === 'en'
      ? canonicalEmotionMap
      : emotionAnalysisService.preserveEmotionAcrossTranslation(canonicalEmotionMap, narrationText, selectedLangConfig.code, scriptObj.script);

    console.log(`[Narration] Language: ${selectedLangConfig.code}`);
    console.log(`[Narration] Text source: ${selectedLangConfig.code === 'en' ? 'canonical_script' : 'story_translation'}`);
    console.log(`[Narration] Characters: ${narrationText.length}`);

    // 7. Complete Story Sent to Emotion-Aware TTS Voice Generation strictly using narrationText
    const audio = await storyAudioService.generateNarrationAudio(
      contentId,
      narrationText,
      narrator,
      activeEmotionMap,
      selectedLangConfig.code,
      characterMap
    );

    // Build user-facing narrator tags
    const narratorTags: string[] = [];
    if (narrator.tone) narratorTags.push(narrator.tone.split(' ')[0]);
    if (narrator.accent) narratorTags.push(narrator.accent);
    narratorTags.push('Story-focused');

    const wordCount = narrationText.trim().split(/\s+/).length;
    const summarySentences = narrationText.split(/(?<=[.!?])\s+/);
    const shortSummary = summarySentences.slice(0, 2).join(' ') || contentRecord.description || `A compelling retelling of ${title}.`;

    const responsePayload = {
      status: 'READY',
      language: selectedLangConfig,
      content: {
        id: contentId,
        title,
        type: contentRecord.contentType,
        description: contentRecord.description
      },
      story: {
        summary: shortSummary,
        fullScript: narrationText,
        wordCount,
        scriptId: contentId
      },
      narrator: {
        voiceName: audio.voiceName,
        gender: narrator.genderPresentation,
        style: narrator.style,
        tags: narratorTags
      },
      emotionMap: activeEmotionMap,
      audio: buildPublicAudioResponse(audio, selectedLangConfig.name, narrator.genderPresentation)
    };

    canonicalScriptMap.set(contentId, {
      title,
      contentType: contentRecord.contentType,
      fullScript: scriptObj.script,
      narrator,
      emotionMap: canonicalEmotionMap
    });

    // Index by both UUID and normalized title so frontend can look up by either
    pipelineStateMap.set(contentId, responsePayload);
    pipelineStateMap.set(title.toLowerCase().trim(), responsePayload);
    return res.status(200).json(responsePayload);
  } catch (err: any) {
    console.error('[ContentPipeline] Error executing pipeline:', err);
    const failureStatus = err.message?.includes('STORY_GENERATION_FAILED')
      ? 'STORY_GENERATION_FAILED'
      : err.message?.includes('RESEARCH')
      ? 'RESEARCH_FAILED'
      : 'PIPELINE_FAILED';

    return res.status(500).json({ status: failureStatus, error: err.message || 'Pipeline execution failed' });
  }
}
