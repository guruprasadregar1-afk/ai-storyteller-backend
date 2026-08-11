import { Request, Response } from 'express';
import { ExportService } from '../../../services/ExportService';

const exportService = new ExportService();

export async function exportSocialVideoController(req: Request, res: Response) {
  const { scriptId, targetPlatform, aspectRatio } = req.body;
  const result = exportService.adaptForSocial(scriptId, targetPlatform, aspectRatio);
  res.json({ success: true, export: result });
}

export async function getExportFormatsController(req: Request, res: Response) {
  const formats = exportService.getSupportedFormats();
  res.json({ success: true, formats });
}
