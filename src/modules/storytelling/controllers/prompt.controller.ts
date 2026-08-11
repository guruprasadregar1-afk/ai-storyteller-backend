import { Request, Response } from 'express';
import { PromptLabService } from '../../../services/PromptLabService';

const promptLabService = new PromptLabService();

export async function createPromptTemplateController(req: Request, res: Response) {
  const template = promptLabService.createTemplate(req.body);
  res.json({ success: true, template });
}

export async function optimizePromptController(req: Request, res: Response) {
  const { rawPrompt, category } = req.body;
  const optimized = promptLabService.optimizePrompt(rawPrompt, category || 'General');
  res.json({ success: true, optimizedPrompt: optimized });
}

export async function getPromptTemplatesController(req: Request, res: Response) {
  const templates = promptLabService.getTemplates();
  res.json({ success: true, templates });
}
