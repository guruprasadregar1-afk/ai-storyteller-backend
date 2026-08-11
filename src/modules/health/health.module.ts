import { Router } from 'express';
import { getHealthController } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/health', getHealthController);
healthRouter.get('/system/diagnostics', getHealthController);
