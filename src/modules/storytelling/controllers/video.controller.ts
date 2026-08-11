import { Request, Response } from 'express';
import { VideoService } from '../../../services/VideoService';

const videoService = new VideoService();

export async function generateSceneVideoController(req: Request, res: Response) {
  const { id } = req.params;
  const { cameraDirective, provider } = req.body;
  const video = await videoService.generateVideoMotion(id, cameraDirective || 'PAN_RIGHT', provider);
  res.json({ success: true, video });
}

export async function getVideoJobStatusController(req: Request, res: Response) {
  const { jobId } = req.params;
  const status = videoService.getVideoJobStatus(jobId);
  res.json({ success: true, job: status });
}

export async function updateMotionSettingsController(req: Request, res: Response) {
  const { id } = req.params;
  const updated = videoService.updateMotionSettings(id, req.body);
  res.json({ success: true, settings: updated });
}
