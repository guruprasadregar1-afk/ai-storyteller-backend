import { Router } from 'express';
import { getAIProvidersHealthController } from './ai.controller';

export const aiRouter = Router();

aiRouter.get('/ai/providers/health', getAIProvidersHealthController);
