import { Request, Response } from 'express';
import { ImageService } from '../../../services/ImageService';

const imageService = new ImageService();

export async function generateSceneImageController(req: Request, res: Response) {
  const { id } = req.params;
  const { visualPrompt, provider } = req.body;
  const image = await imageService.generateKeyframeImage(id, visualPrompt || 'Cinematic shot', provider);
  res.json({ success: true, image });
}

export async function startBatchImageGenerationController(req: Request, res: Response) {
  const { sceneIds } = req.body;
  const job = imageService.startBatchGeneration(sceneIds || []);
  res.json({ success: true, job });
}

export async function getImageJobStatusController(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = imageService.getJobStatus(jobId);
  res.json({ success: true, job });
}
