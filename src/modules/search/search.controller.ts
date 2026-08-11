import { Request, Response } from 'express';
import { SearchService } from './search.service';

const searchService = new SearchService();

export async function searchContentController(req: Request, res: Response) {
  const query = (req.query.q as string) || '';
  const match = await searchService.searchContent(query);
  res.json({ success: true, query, match });
}
