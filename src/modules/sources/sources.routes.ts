import { Router } from 'express';
import { analyzeContentController, getContentByIdController } from './sources.controller';

export const sourcesRouter = Router();

sourcesRouter.post('/content/analyze', analyzeContentController);
sourcesRouter.get('/content/:id', getContentByIdController);
