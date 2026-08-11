import { Request, Response } from 'express';
import { AIService } from './ai.service';

const aiService = new AIService();

export async function getAIProvidersHealthController(req: Request, res: Response) {
  const health = await aiService.getProvidersHealth();
  res.json({ success: true, providers: health });
}
