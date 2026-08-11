import { Router } from 'express';
import { researchContentController } from './research.controller';

export const researchRouter = Router();

researchRouter.post('/content/:id/research', researchContentController);
