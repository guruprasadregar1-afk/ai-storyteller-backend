import { Request, Response } from 'express';
import { QueueService } from '../../../services/QueueService';

const queueService = new QueueService();

export async function enqueueJobController(req: Request, res: Response) {
  const { taskName, payload, webhookUrl } = req.body;
  const job = await queueService.enqueueJob(taskName, payload, webhookUrl);
  res.json({ success: true, job });
}

export async function getJobStatusController(req: Request, res: Response) {
  const { id } = req.params;
  const job = await queueService.getJob(id);
  res.json({ success: true, job });
}

export async function registerWebhookController(req: Request, res: Response) {
  const { event, targetUrl } = req.body;
  const webhook = queueService.registerWebhook(event, targetUrl);
  res.json({ success: true, webhook });
}
