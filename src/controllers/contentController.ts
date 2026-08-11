import { Request, Response } from 'express';
import { AIProviderManager } from '../ai/AIProviderManager';
import { ContentService } from '../services/ContentService';
import { ResearchService } from '../services/ResearchService';
import { RightsService } from '../services/RightsService';
import { ScriptService } from '../services/ScriptService';
import { CharacterService } from '../services/CharacterService';
import { NarratorService } from '../services/NarratorService';
import { SceneService } from '../services/SceneService';

const aiManager = new AIProviderManager();
const contentService = new ContentService();
const researchService = new ResearchService();
const rightsService = new RightsService();
const scriptService = new ScriptService(aiManager, rightsService);
const characterService = new CharacterService(aiManager);
const narratorService = new NarratorService(aiManager);
const sceneService = new SceneService(aiManager);

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
