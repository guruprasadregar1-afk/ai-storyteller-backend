import { Request, Response } from 'express';
import { ResearchService } from './research.service';

const researchService = new ResearchService();

export async function researchContentController(req: Request, res: Response) {
  const { id } = req.params;
  const { topic } = req.body;
  const facts = await researchService.researchTopic(id, topic || id);
  res.json({ success: true, contentId: id, topic, facts });
}
