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
