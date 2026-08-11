import { Router } from 'express';

import { generateScriptController } from './controllers/script.controller';
import {
  getCharactersController,
  generateCharacterVisualsController,
  getCharacterBibleController,
  updateCharacterAvatarController
} from './controllers/character.controller';
import {
  segmentScriptController,
  getScenesController,
  updateSceneBeatController
} from './controllers/scene.controller';
import {
  getStylePresetsController,
  createStylePresetController,
  generateEnvironmentRefController
} from './controllers/style.controller';
import {
  generateSceneImageController,
  startBatchImageGenerationController,
  getImageJobStatusController
} from './controllers/image.controller';
import {
  getNarratorController,
  synthesizeNarratorController,
  synthesizeDialogueController,
  getVoiceCatalogController
} from './controllers/voice.controller';
import {
  recommendMusicController,
  mixAudioController,
  getSFXCatalogController
} from './controllers/audio.controller';
import {
  generateSceneVideoController,
  getVideoJobStatusController,
  updateMotionSettingsController
} from './controllers/video.controller';
import {
  syncTimelineController,
  getTimelineController,
  updateTimelineClipController
} from './controllers/timeline.controller';
import {
  generateSubtitlesController,
  translateSubtitlesController,
  exportSubtitlesController
} from './controllers/subtitle.controller';
import {
  startRenderJobController,
  getRenderJobStatusController,
  cancelRenderJobController
} from './controllers/render.controller';
import {
  enqueueJobController,
  getJobStatusController,
  registerWebhookController
} from './controllers/queue.controller';
import {
  exportSocialVideoController,
  getExportFormatsController
} from './controllers/export.controller';
import {
  createPromptTemplateController,
  optimizePromptController,
  getPromptTemplatesController
} from './controllers/prompt.controller';
import {
  createCollaborationRoomController,
  lockSceneElementController,
  getRoomPresenceController
} from './controllers/collaboration.controller';
import {
  addScriptBranchNodeController,
  getScriptBranchTreeController,
  traverseScriptChoicesController
} from './controllers/branching.controller';
import {
  logAnalyticsEventController,
  getRetentionHeatmapController,
  runABExperimentController
} from './controllers/analytics.controller';
import { runMasterPipelineController } from './controllers/pipeline.controller';

export const storytellingRouter = Router();

// Scripts
storytellingRouter.post('/content/:id/script', generateScriptController);

// Characters & Visual Bible
storytellingRouter.get('/content/:id/characters', getCharactersController);
storytellingRouter.get('/content/:id/narrator', getNarratorController);
storytellingRouter.post('/characters/:id/visuals', generateCharacterVisualsController);
storytellingRouter.get('/characters/:id/bible', getCharacterBibleController);
storytellingRouter.put('/characters/:id/avatar', updateCharacterAvatarController);

// Scene Beats
storytellingRouter.post('/scripts/:id/segment', segmentScriptController);
storytellingRouter.get('/scripts/:id/scenes', getScenesController);
storytellingRouter.put('/scripts/:id/scenes/:sceneId', updateSceneBeatController);

// Styles & Environments
storytellingRouter.get('/styles', getStylePresetsController);
storytellingRouter.post('/styles/preset', createStylePresetController);
storytellingRouter.post('/environments/generate', generateEnvironmentRefController);

// Keyframe Images
storytellingRouter.post('/scenes/:id/generate-image', generateSceneImageController);
storytellingRouter.post('/scenes/batch-generate', startBatchImageGenerationController);
storytellingRouter.get('/jobs/images/:jobId', getImageJobStatusController);

// Voice Synthesis & Dialogue
storytellingRouter.post('/narrator/synthesize', synthesizeNarratorController);
storytellingRouter.post('/dialogue/synthesize', synthesizeDialogueController);
storytellingRouter.get('/voices/catalog', getVoiceCatalogController);

// Audio & Soundtrack
storytellingRouter.post('/audio/recommend-music', recommendMusicController);
storytellingRouter.post('/audio/mix', mixAudioController);
storytellingRouter.get('/audio/sfx-catalog', getSFXCatalogController);

// Video Motion
storytellingRouter.post('/scenes/:id/generate-video', generateSceneVideoController);
storytellingRouter.get('/jobs/video/:jobId', getVideoJobStatusController);
storytellingRouter.post('/scenes/:id/motion-settings', updateMotionSettingsController);

// Multi-Track Timeline
storytellingRouter.post('/timeline/sync', syncTimelineController);
storytellingRouter.get('/timeline/:scriptId', getTimelineController);
storytellingRouter.put('/timeline/clips/:clipId', updateTimelineClipController);

// Subtitles
storytellingRouter.post('/subtitles/generate', generateSubtitlesController);
storytellingRouter.post('/subtitles/translate', translateSubtitlesController);
storytellingRouter.get('/subtitles/export/:scriptId', exportSubtitlesController);

// Cloud Rendering
storytellingRouter.post('/render/start', startRenderJobController);
storytellingRouter.get('/render/:jobId', getRenderJobStatusController);
storytellingRouter.post('/render/:jobId/cancel', cancelRenderJobController);

// Job Queue & Webhooks
storytellingRouter.post('/queue/jobs', enqueueJobController);
storytellingRouter.get('/queue/jobs/:id', getJobStatusController);
storytellingRouter.post('/webhooks/register', registerWebhookController);

// Platform Export
storytellingRouter.post('/export/social', exportSocialVideoController);
storytellingRouter.get('/export/formats', getExportFormatsController);

// Prompt Engineering Lab
storytellingRouter.post('/prompts/templates', createPromptTemplateController);
storytellingRouter.post('/prompts/optimize', optimizePromptController);
storytellingRouter.get('/prompts/templates', getPromptTemplatesController);

// Realtime Collaboration
storytellingRouter.post('/collaboration/rooms', createCollaborationRoomController);
storytellingRouter.post('/collaboration/rooms/:id/lock', lockSceneElementController);
storytellingRouter.get('/collaboration/rooms/:id/presence', getRoomPresenceController);

// Interactive Story Branching
storytellingRouter.post('/scripts/:id/branches', addScriptBranchNodeController);
storytellingRouter.get('/scripts/:id/tree', getScriptBranchTreeController);
storytellingRouter.post('/scripts/:id/choices', traverseScriptChoicesController);

// Audience Analytics & Heatmaps
storytellingRouter.post('/analytics/events', logAnalyticsEventController);
storytellingRouter.get('/analytics/heatmaps/:scriptId', getRetentionHeatmapController);
storytellingRouter.post('/analytics/experiments', runABExperimentController);

// End-to-End Master Pipeline
storytellingRouter.post('/pipeline/run', runMasterPipelineController);
