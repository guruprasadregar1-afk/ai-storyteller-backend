import { Request, Response } from 'express';
import { RenderService } from '../../../services/RenderService';

const renderService = new RenderService();

export async function startRenderJobController(req: Request, res: Response) {
  const { scriptId, resolution, fps } = req.body;
  const job = await renderService.startRenderJob(scriptId, resolution || '1080p', fps || 30);
  res.json({ success: true, renderJob: job });
}

export async function getRenderJobStatusController(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = renderService.getRenderJobStatus(jobId);
  res.json({ success: true, renderJob: job });
}

export async function cancelRenderJobController(req: Request, res: Response) {
  const { jobId } = req.params;
  const cancelled = renderService.cancelRenderJob(jobId);
  res.json({ success: true, renderJob: cancelled });
}
