import { Request, Response } from 'express';
import { AIProviderManager } from '../ai/AIProviderManager';
import { ContentService } from '../services/ContentService';
import { ResearchService } from '../services/ResearchService';
import { RightsService } from '../services/RightsService';
import { ScriptService } from '../services/ScriptService';
import { CharacterService } from '../services/CharacterService';
import { NarratorService } from '../services/NarratorService';
import { SceneService } from '../services/SceneService';
import { StyleService } from '../services/StyleService';
import { ImageService } from '../services/ImageService';
import { VoiceService } from '../services/VoiceService';
import { AudioService } from '../services/AudioService';
import { VideoService } from '../services/VideoService';
import { TimelineService } from '../services/TimelineService';
import { SubtitleService } from '../services/SubtitleService';
import { RenderService } from '../services/RenderService';
import { QueueService } from '../services/QueueService';
import { ExportService } from '../services/ExportService';
import { PromptLabService } from '../services/PromptLabService';
import { CollaborationService } from '../services/CollaborationService';
import { BranchingService } from '../services/BranchingService';
import { WorkspaceService } from '../services/WorkspaceService';

const aiManager = new AIProviderManager();
const contentService = new ContentService();
const researchService = new ResearchService();
const rightsService = new RightsService();
const scriptService = new ScriptService(aiManager, rightsService);
const characterService = new CharacterService(aiManager);
const narratorService = new NarratorService(aiManager);
const sceneService = new SceneService(aiManager);
const styleService = new StyleService();
const imageService = new ImageService();
const voiceService = new VoiceService();
const audioService = new AudioService();
const videoService = new VideoService();
const timelineService = new TimelineService();
const subtitleService = new SubtitleService();
const renderService = new RenderService();
const queueService = new QueueService();
const exportService = new ExportService();
const promptLabService = new PromptLabService();
const collaborationService = new CollaborationService();
const branchingService = new BranchingService();
const workspaceService = new WorkspaceService();

export const analyzeContent = async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input title or context is required.' });
    }

    // Step 1: Database-first lookup check
    const existing = await contentService.findExistingContent(input);
    if (existing) {
      return res.json({
        source: 'DATABASE_CACHE',
        isCached: true,
        content: existing
      });
    }

    // Step 2: AI Classification
    const classification = await aiManager.classifyContent(input);

    // Step 3: Research & record creation
    const research = await researchService.performResearch(input, classification.contentType);
    const rightsCheck = rightsService.evaluateRights(classification.contentType, input);

    const savedRecord = await contentService.saveContentRecord({
      title: classification.canonicalTitle,
      contentType: classification.contentType,
      description: research.description,
      rightsStatus: rightsCheck.rightsStatus,
      aliases: [input],
      references: research.references
    });

    return res.json({
      source: 'AI_CLASSIFIED_AND_RESEARCHED',
      isCached: false,
      classification,
      rightsCheck,
      content: savedRecord
    });
  } catch (err: any) {
    console.error('[analyzeContent] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const searchContent = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required.' });
    }

    const match = await contentService.findExistingContent(query);
    return res.json({
      query,
      results: match ? [match] : []
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getContentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const match = await contentService.findExistingContent(id);
    if (!match) {
      return res.status(404).json({ error: 'Content record not found.' });
    }
    return res.json({ content: match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const researchContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await contentService.findExistingContent(id);
    const title = existing ? existing.title : id;
    const type = existing ? existing.contentType : 'USER_CONTEXT';

    const research = await researchService.performResearch(title, type);
    const updatedRecord = await contentService.saveContentRecord({
      title,
      contentType: type,
      description: research.description,
      references: research.references
    });

    return res.json({ research, content: updatedRecord });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const generateScript = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mode = 'DETAILED_STORY', language = 'English' } = req.body;

    const existing = await contentService.findExistingContent(id);
    const title = existing ? existing.title : id;
    const contentType = existing ? existing.contentType : 'USER_CONTEXT';

    const facts = existing?.references.map(r => r.evidence) || [`Story centered on ${title}.`];

    const script = await scriptService.generateScript(title, contentType, facts, { mode, language });
    return res.json({ script });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCharacters = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await contentService.findExistingContent(id);
    const title = existing ? existing.title : id;

    const characters = await characterService.extractCharacters(title);
    return res.json({ title, characters });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getNarrator = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await contentService.findExistingContent(id);
    const title = existing ? existing.title : id;
    const contentType = existing ? existing.contentType : 'USER_CONTEXT';

    const characters = await characterService.extractCharacters(title);
    const scriptText = `The story of ${title}.`;
    const narrator = await narratorService.selectNarrator({ title, contentType }, scriptText, characters);

    return res.json({ title, narrator });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAIHealth = async (req: Request, res: Response) => {
  try {
    const health = await aiManager.getHealthStatus();
    return res.json(health);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 2 Controllers: Scene Beat Breakdown
export const segmentScriptBeats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scriptText } = req.body;

    const textToSegment = scriptText || `In a vivid world of emotion and journey, this is the story of ${id}. Through hardship, courage, and triumph, their legacy lives on.`;
    const beats = await sceneService.segmentScript(id, textToSegment);

    return res.json({ scriptId: id, beats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getScriptScenes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let scenes = await sceneService.getScenesByScriptId(id);

    if (scenes.length === 0) {
      // Auto segment default script if not segmented yet
      const textToSegment = `In a vivid world of emotion and journey, this is the story of ${id}. Through hardship, courage, and triumph, their legacy lives on.`;
      scenes = await sceneService.segmentScript(id, textToSegment);
    }

    return res.json({ scriptId: id, scenes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateScriptSceneBeat = async (req: Request, res: Response) => {
  try {
    const { id, sceneId } = req.params;
    const updates = req.body;

    const updated = await sceneService.updateSceneBeat(id, sceneId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Scene beat not found.' });
    }

    return res.json({ scriptId: id, scene: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 3 Controllers: Character Consistency & Visual Bible Engine
export const generateCharacterVisualsController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customTrait } = req.body;

    const visual = await characterService.generateVisualBible(id, customTrait);
    return res.json({ characterId: id, visual });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCharacterVisualBibleController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bible = await characterService.getVisualBible(id);
    return res.json({ characterId: id, bible });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateCharacterAvatarController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seed, avatarUrl, clothingStyle } = req.body;

    if (seed === undefined) {
      return res.status(400).json({ error: 'Seed integer parameter is required for locking character visual consistency.' });
    }

    const updated = await characterService.updateAvatarAndSeed(id, Number(seed), avatarUrl, clothingStyle);
    return res.json({ characterId: id, visual: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 4 Controllers: Environment & Style Preset Engine
export const getStylePresetsController = async (req: Request, res: Response) => {
  try {
    const presets = styleService.getStylePresets();
    return res.json({ presets });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createStylePresetController = async (req: Request, res: Response) => {
  try {
    const { name, category = 'Custom', promptModifier, negativePrompt, paletteTags = [] } = req.body;
    if (!name || !promptModifier) {
      return res.status(400).json({ error: 'Style preset name and promptModifier are required.' });
    }

    const preset = styleService.saveStylePreset({
      name,
      category,
      promptModifier,
      negativePrompt,
      paletteTags,
      coherenceScore: 0.95
    });

    return res.status(201).json({ preset });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const generateEnvironmentRefController = async (req: Request, res: Response) => {
  try {
    const { locationName, stylePresetName = 'Cinematic 3D' } = req.body;
    if (!locationName) {
      return res.status(400).json({ error: 'locationName parameter is required.' });
    }

    const envRef = styleService.generateEnvironmentRef(locationName, stylePresetName);
    return res.json({ environment: envRef });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 5 Controllers: Keyframe Image Generation Pipeline
export const generateSceneImageController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt, provider = 'replicate-flux', seed = 424242 } = req.body;

    const imagePrompt = prompt || `Cinematic image render for scene beat ${id}`;
    const image = await imageService.generateKeyframeImage(id, imagePrompt, provider, Number(seed));

    return res.json({ sceneId: id, image });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const batchGenerateImagesController = async (req: Request, res: Response) => {
  try {
    const { scenes } = req.body;
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'scenes array containing sceneId and prompt objects is required.' });
    }

    const job = await imageService.startBatchGeneration(scenes);
    return res.status(202).json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getImageJobStatusController = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await imageService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Image generation job not found.' });
    }

    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 6 Controllers: Voice Synthesis & Multi-Voice Narration Engine
export const synthesizeNarratorController = async (req: Request, res: Response) => {
  try {
    const { text, voiceId = 'eleven-rachel', provider = 'elevenlabs', emotion = 'Neutral', speed = 1.0, pitch = 1.0 } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text parameter is required for voice synthesis.' });
    }

    const audio = await voiceService.synthesizeSpeech(text, voiceId, provider, emotion, Number(speed), Number(pitch));
    return res.json({ audio });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const synthesizeDialogueController = async (req: Request, res: Response) => {
  try {
    const { lines } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines array containing speaker and text objects is required.' });
    }

    const dialogueResult = await voiceService.synthesizeMultiSpeakerDialogue(lines);
    return res.json(dialogueResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVoiceCatalogController = async (req: Request, res: Response) => {
  try {
    const voices = voiceService.getVoiceCatalog();
    return res.json({ voices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 7 Controllers: Soundtrack, Ambient Sound & SFX Engine
export const recommendMusicController = async (req: Request, res: Response) => {
  try {
    const { moodOrGenre = 'cinematic epic' } = req.body;
    const music = audioService.recommendMusic(moodOrGenre);
    return res.json({ music });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const mixAudioController = async (req: Request, res: Response) => {
  try {
    const { narrationTrackUrl, musicTrackUrl, sfxTrackUrls = [], duckingLevelDb = -14.0 } = req.body;
    if (!narrationTrackUrl || !musicTrackUrl) {
      return res.status(400).json({ error: 'narrationTrackUrl and musicTrackUrl are required.' });
    }

    const mixConfig = audioService.mixAudioTracks(narrationTrackUrl, musicTrackUrl, sfxTrackUrls, Number(duckingLevelDb));
    return res.json({ mix: mixConfig });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getSFXCatalogController = async (req: Request, res: Response) => {
  try {
    const sfx = audioService.getSFXCatalog();
    return res.json({ sfx });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 8 Controllers: Video Motion & Camera Animation Pipeline
export const generateSceneVideoController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sourceImageUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675', motionType = 'PAN_RIGHT', motionStrength = 5.0, provider = 'runway-gen3' } = req.body;

    const job = await videoService.generateVideoMotion(id, sourceImageUrl, motionType, Number(motionStrength), provider);
    return res.status(202).json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getVideoJobStatusController = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await videoService.getVideoJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Video generation job not found.' });
    }

    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateMotionSettingsController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motionType, motionStrength } = req.body;
    if (!motionType || motionStrength === undefined) {
      return res.status(400).json({ error: 'motionType and motionStrength are required.' });
    }

    const updated = await videoService.updateMotionSettings(id, motionType, Number(motionStrength));
    if (!updated) {
      return res.status(404).json({ error: 'Video motion setting for scene not found.' });
    }

    return res.json({ sceneId: id, motion: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 9 Controllers: Multi-Track Timeline & Audio-Visual Sync Engine
export const syncTimelineController = async (req: Request, res: Response) => {
  try {
    const { scriptId, sceneClips = [], narrationClips = [], musicTrackUrl } = req.body;
    if (!scriptId) {
      return res.status(400).json({ error: 'scriptId parameter is required.' });
    }

    const timeline = await timelineService.syncScriptTimeline(scriptId, sceneClips, narrationClips, musicTrackUrl);
    const drift = timelineService.detectAudioVisualDrift(timeline);

    return res.json({ timeline, drift });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getTimelineController = async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    const timeline = await timelineService.getTimelineByScriptId(scriptId);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found for scriptId.' });
    }

    return res.json({ timeline });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateTimelineClipController = async (req: Request, res: Response) => {
  try {
    const { clipId } = req.params;
    const { scriptId, startTimeSeconds, durationSeconds } = req.body;

    if (!scriptId || startTimeSeconds === undefined || durationSeconds === undefined) {
      return res.status(400).json({ error: 'scriptId, startTimeSeconds, and durationSeconds are required.' });
    }

    const clip = await timelineService.updateClipSettings(scriptId, clipId, Number(startTimeSeconds), Number(durationSeconds));
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found in timeline.' });
    }

    return res.json({ clipId, clip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 10 Controllers: Subtitle, Captioning & Multilingual Translation Engine
export const generateSubtitlesController = async (req: Request, res: Response) => {
  try {
    const { scriptId, narrationBeats = [], language = 'English' } = req.body;
    if (!scriptId || narrationBeats.length === 0) {
      return res.status(400).json({ error: 'scriptId and non-empty narrationBeats array are required.' });
    }

    const subtitle = await subtitleService.generateSubtitles(scriptId, narrationBeats, language);
    return res.json({ subtitle });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const translateSubtitlesController = async (req: Request, res: Response) => {
  try {
    const { scriptId, targetLanguage } = req.body;
    if (!scriptId || !targetLanguage) {
      return res.status(400).json({ error: 'scriptId and targetLanguage are required.' });
    }

    const translated = await subtitleService.translateSubtitles(scriptId, targetLanguage);
    if (!translated) {
      return res.status(404).json({ error: 'Source English subtitles not found for translation.' });
    }

    return res.json({ subtitle: translated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const exportSubtitlesController = async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;
    const format = (req.query.format as string) || 'srt';
    const lang = (req.query.lang as string) || 'English';

    const sub = subtitleService.getSubtitles(scriptId, lang);
    if (!sub) {
      return res.status(404).json({ error: `Subtitles not found for script ${scriptId} in ${lang}.` });
    }

    if (format === 'vtt') {
      res.setHeader('Content-Type', 'text/vtt');
      return res.send(subtitleService.generateVTT(sub.cues));
    } else {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(subtitleService.generateSRT(sub.cues));
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 11 Controllers: Final Video Assembly & Rendering Pipeline
export const startRenderJobController = async (req: Request, res: Response) => {
  try {
    const { scriptId, resolution = '1080p', fps = 30 } = req.body;
    if (!scriptId) {
      return res.status(400).json({ error: 'scriptId parameter is required.' });
    }

    const job = await renderService.startRenderJob(scriptId, resolution, Number(fps));
    return res.status(202).json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getRenderJobStatusController = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await renderService.getRenderJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Render job not found.' });
    }

    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const cancelRenderJobController = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const cancelled = await renderService.cancelRenderJob(jobId);

    if (!cancelled) {
      return res.status(404).json({ error: 'Render job not found.' });
    }

    return res.json({ job: cancelled });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 12 Controllers: Production-Grade Queue, Job Scheduling & Webhook Infrastructure
export const enqueueJobController = async (req: Request, res: Response) => {
  try {
    const { taskName, payload = {}, webhookUrl, maxAttempts = 3 } = req.body;
    if (!taskName) {
      return res.status(400).json({ error: 'taskName parameter is required.' });
    }

    const job = await queueService.enqueueJob(taskName, payload, webhookUrl, Number(maxAttempts));
    return res.status(202).json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getJobStatusController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await queueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Queue job not found.' });
    }

    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const registerWebhookController = async (req: Request, res: Response) => {
  try {
    const { event, url } = req.body;
    if (!event || !url) {
      return res.status(400).json({ error: 'event and url parameters are required.' });
    }

    const webhook = queueService.registerWebhook(event, url);
    return res.status(201).json({ webhook });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 13 Controllers: Aspect Ratio, Social Export & Multi-Format Video Adapter
export const exportSocialVideoController = async (req: Request, res: Response) => {
  try {
    const { scriptId, aspectRatio = '16:9', targetPlatform = 'YouTube' } = req.body;
    if (!scriptId) {
      return res.status(400).json({ error: 'scriptId parameter is required.' });
    }

    const exportItem = await exportService.adaptForSocial(scriptId, aspectRatio, targetPlatform);
    return res.status(201).json({ export: exportItem });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getExportFormatsController = async (req: Request, res: Response) => {
  try {
    const formats = exportService.getAvailableFormats();
    return res.json({ formats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 14 Controllers: Prompt Engineering Lab & Visual Bible Fine-Tuning Studio
export const createPromptTemplateController = async (req: Request, res: Response) => {
  try {
    const { name, category = 'Custom', templateText, negativePrompt } = req.body;
    if (!name || !templateText) {
      return res.status(400).json({ error: 'name and templateText parameters are required.' });
    }

    const template = promptLabService.saveTemplate({
      name,
      category,
      templateText,
      negativePrompt,
      tokenEstimate: 0
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const optimizePromptController = async (req: Request, res: Response) => {
  try {
    const { prompt, styleCategory = 'Cinematic' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt parameter is required.' });
    }

    const result = promptLabService.optimizePrompt(prompt, styleCategory);
    return res.json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPromptTemplatesController = async (req: Request, res: Response) => {
  try {
    const templates = promptLabService.getTemplates();
    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 15 Controllers: Collaborative Storyboarding & Real-Time Multiplayer Engine
export const createCollabRoomController = async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.body;
    if (!scriptId) {
      return res.status(400).json({ error: 'scriptId parameter is required.' });
    }

    const room = collaborationService.createRoom(scriptId);
    return res.status(201).json({ room });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const lockCollabElementController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // roomId
    const { elementId, userId } = req.body;

    if (!elementId || !userId) {
      return res.status(400).json({ error: 'elementId and userId parameters are required.' });
    }

    const lockResult = collaborationService.lockElement(id, elementId, userId);
    return res.json(lockResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCollabPresenceController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // roomId
    const activeUsers = collaborationService.getPresence(id);
    return res.json({ roomId: id, activeUsers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 16 Controllers: Interactive Story Branching, Choice Nodes & CYOA Engine
export const addScriptBranchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // scriptId
    const { nodeId, sceneContent, parentNodeId, choiceLabel } = req.body;

    if (!nodeId || !sceneContent) {
      return res.status(400).json({ error: 'nodeId and sceneContent parameters are required.' });
    }

    const branch = branchingService.addBranchNode(id, nodeId, sceneContent, parentNodeId, choiceLabel);
    return res.status(201).json({ branch });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getScriptBranchTreeController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // scriptId
    const { rootNodeId = 'root' } = req.query;

    const tree = branchingService.getBranchTree(id, String(rootNodeId));
    if (!tree) {
      return res.status(404).json({ error: 'Branch tree root not found.' });
    }

    const leafEndings = branchingService.countLeafEndings(id);
    return res.json({ tree, leafEndings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const traverseScriptChoicesController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // scriptId
    const { nodeIds = [] } = req.body;

    const path = branchingService.traversePath(id, nodeIds);
    return res.json({ scriptId: id, path });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Sprint 17 Controllers: Multi-User Workspace, Access Control & Permissions
export const createWorkspaceController = async (req: Request, res: Response) => {
  try {
    const { name, ownerId, ownerEmail } = req.body;
    if (!name || !ownerId || !ownerEmail) {
      return res.status(400).json({ error: 'name, ownerId, and ownerEmail parameters are required.' });
    }

    const workspace = workspaceService.createWorkspace(name, ownerId, ownerEmail);
    return res.status(201).json({ workspace });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const addWorkspaceMemberController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // workspaceId
    const { userId, email, role = 'EDITOR' } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email parameters are required.' });
    }

    const workspace = workspaceService.addMember(id, userId, email, role);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    return res.json({ workspace });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const checkWorkspacePermissionsController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // workspaceId
    const { userId, action = 'VIEW' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }

    const allowed = workspaceService.hasPermission(id, String(userId), action as any);
    return res.json({ workspaceId: id, userId, action, allowed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
