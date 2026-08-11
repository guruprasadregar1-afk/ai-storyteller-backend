import { Request, Response } from 'express';
import { HealthService } from './health.service';

const healthService = new HealthService();

export async function getHealthController(req: Request, res: Response) {
  const result = await healthService.getHealthDiagnostics();
  res.json(result);
}
