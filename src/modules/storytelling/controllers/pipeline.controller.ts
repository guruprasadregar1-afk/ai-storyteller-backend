import { Request, Response } from 'express';
import { ContentService } from '../../../services/ContentService';
import { ScriptService } from '../../../services/ScriptService';
import { SceneService } from '../../../services/SceneService';
import { CharacterService } from '../../../services/CharacterService';
import { ImageService } from '../../../services/ImageService';
import { VoiceService } from '../../../services/VoiceService';
import { AudioService } from '../../../services/AudioService';
import { VideoService } from '../../../services/VideoService';
import { TimelineService } from '../../../services/TimelineService';
import { SubtitleService } from '../../../services/SubtitleService';
import { RenderService } from '../../../services/RenderService';
import { MasterOrchestratorService } from '../../../services/MasterOrchestratorService';
import { AIProviderManager } from '../../../ai/AIProviderManager';
import { RightsService } from '../../../services/RightsService';

const aiManager = new AIProviderManager();
const rightsService = new RightsService();

const contentService = new ContentService();
const scriptService = new ScriptService(aiManager, rightsService);
const sceneService = new SceneService(aiManager);
const characterService = new CharacterService(aiManager);
const imageService = new ImageService();
const voiceService = new VoiceService();
const audioService = new AudioService();
const videoService = new VideoService();
const timelineService = new TimelineService();
const subtitleService = new SubtitleService();
const renderService = new RenderService();

const masterOrchestratorService = new MasterOrchestratorService(
  contentService,
  scriptService,
  sceneService,
  characterService,
  imageService,
  voiceService,
  audioService,
  videoService,
  timelineService,
  subtitleService,
  renderService
);

export async function runMasterPipelineController(req: Request, res: Response) {
  const { titleInput, contentType } = req.body;
  const result = await masterOrchestratorService.runFullProductionPipeline(titleInput, contentType || 'HISTORY');
  res.json({ success: true, pipeline: result });
}
