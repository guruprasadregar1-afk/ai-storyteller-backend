import { Request, Response } from 'express';
import { VideoService } from '../../../services/VideoService';

const videoService = new VideoService();

export async function generateSceneVideoController(req: Request, res: Response) {
  const { id } = req.params;
  const { sourceImageUrl, cameraDirective, motionStrength, provider } = req.body;
  const video = await videoService.generateVideoMotion(
    id,
    sourceImageUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119',
    cameraDirective || 'PAN_RIGHT',
    motionStrength || 5,
    provider
  );
  res.json({ success: true, video });
}

export async function getVideoJobStatusController(req: Request, res: Response) {
  const { jobId } = req.params;
  const status = await videoService.getVideoJobStatus(jobId);
  res.json({ success: true, job: status });
}

export async function updateMotionSettingsController(req: Request, res: Response) {
  const { id } = req.params;
  const { motionType, motionStrength } = req.body;
  const updated = await videoService.updateMotionSettings(id, motionType || 'PAN_RIGHT', motionStrength || 5);
  res.json({ success: true, settings: updated });
}
