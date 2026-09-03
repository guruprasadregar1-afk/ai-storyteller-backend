import { Router } from 'express';
import {
  analyzeContentController,
  getContentController,
  researchContentController,
  generateStoryController,
  getStoryController,
  getNarratorController,
  generateAudioController,
  getResultController,
  runFullPipelineController,
  getLanguagesController,
  translateContentController,
  getPipelineJobController
} from './content.controller';

export const contentRouter = Router();

contentRouter.get('/content/languages', getLanguagesController);
contentRouter.get('/content/jobs/:jobId', getPipelineJobController);
contentRouter.post('/content/translate', translateContentController);
contentRouter.post('/content/analyze', analyzeContentController);
contentRouter.post('/content/pipeline', runFullPipelineController);
contentRouter.get('/content/:contentId', getContentController);
contentRouter.post('/content/:contentId/research', researchContentController);
contentRouter.post('/content/:contentId/story', generateStoryController);
contentRouter.get('/content/:contentId/story', getStoryController);
contentRouter.get('/content/:contentId/narrator', getNarratorController);
contentRouter.post('/content/:contentId/audio', generateAudioController);
contentRouter.get('/content/:contentId/result', getResultController);
