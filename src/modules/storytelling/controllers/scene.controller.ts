import { Request, Response } from 'express';
import { AIProviderManager } from '../../../ai/AIProviderManager';
import { SceneService } from '../../../services/SceneService';

const aiManager = new AIProviderManager();
const sceneService = new SceneService(aiManager);

export async function segmentScriptController(req: Request, res: Response) {
  const { id } = req.params;
  const { scriptText } = req.body;
  const beats = await sceneService.segmentScript(id, scriptText || 'Sample script text');
  res.json({ success: true, beats });
}

export async function getScenesController(req: Request, res: Response) {
  const { id } = req.params;
  const scenes = sceneService.getScriptScenes(id);
  res.json({ success: true, scenes });
}

export async function updateSceneBeatController(req: Request, res: Response) {
  const { id, sceneId } = req.params;
  const updated = sceneService.updateSceneBeat(id, sceneId, req.body);
  res.json({ success: true, scene: updated });
}
