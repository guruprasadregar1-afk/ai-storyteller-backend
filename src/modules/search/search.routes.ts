import { Router } from 'express';
import { searchContentController } from './search.controller';

export const searchRouter = Router();

searchRouter.get('/content/search', searchContentController);
