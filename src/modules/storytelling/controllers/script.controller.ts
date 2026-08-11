import { Request, Response } from 'express';
import { AIProviderManager } from '../../../ai/AIProviderManager';
import { RightsService } from '../../../services/RightsService';
import { ScriptService } from '../../../services/ScriptService';

const aiManager = new AIProviderManager();
const rightsService = new RightsService();
const scriptService = new ScriptService(aiManager, rightsService);

export async function generateScriptController(req: Request, res: Response) {
  const { id } = req.params;
  const { narrativeVoice, facts, params } = req.body;
  const script = await scriptService.generateScript(id, 'HISTORY', facts || [], params || {});
  res.json({ success: true, script });
}
