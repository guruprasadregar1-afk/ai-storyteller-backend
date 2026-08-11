import { Request, Response } from 'express';
import { SourcesService } from './sources.service';

const sourcesService = new SourcesService();

export async function analyzeContentController(req: Request, res: Response) {
  const { input, contentType } = req.body;
  const result = await sourcesService.analyzeSourceInput(input, contentType);
  res.json(result);
}

export async function getContentByIdController(req: Request, res: Response) {
  const { id } = req.params;
  const content = await sourcesService.getSourceById(id);
  res.json({ success: true, content });
}
