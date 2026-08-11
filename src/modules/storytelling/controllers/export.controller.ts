import { Request, Response } from 'express';
import { ExportService } from '../../../services/ExportService';

const exportService = new ExportService();

export async function exportSocialVideoController(req: Request, res: Response) {
  const { scriptId, targetPlatform, aspectRatio } = req.body;
  const result = await exportService.adaptForSocial(scriptId, aspectRatio || '16:9', targetPlatform || 'YouTube');
  res.json({ success: true, export: result });
}

export async function getExportFormatsController(req: Request, res: Response) {
  const formats = exportService.getAvailableFormats();
  res.json({ success: true, formats });
}
