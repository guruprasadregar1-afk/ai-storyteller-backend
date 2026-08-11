import { Router } from 'express';
import {
  generateScriptController,
  getCharactersController,
  getNarratorController,
  segmentScriptController,
  getScenesController,
  updateSceneBeatController,
  generateCharacterVisualsController,
  getCharacterBibleController,
  updateCharacterAvatarController,
  getStylePresetsController,
  createStylePresetController,
  generateEnvironmentRefController,
  generateSceneImageController,
  startBatchImageGenerationController,
  getImageJobStatusController,
  synthesizeNarratorController,
  synthesizeDialogueController,
  getVoiceCatalogController,
  recommendMusicController,
  mixAudioController,
  getSFXCatalogController,
  generateSceneVideoController,
  getVideoJobStatusController,
  updateMotionSettingsController,
  syncTimelineController,
  getTimelineController,
  updateTimelineClipController,
  generateSubtitlesController,
  translateSubtitlesController,
  exportSubtitlesController,
  startRenderJobController,
  getRenderJobStatusController,
  cancelRenderJobController,
  enqueueJobController,
  getJobStatusController,
  registerWebhookController,
  exportSocialVideoController,
  getExportFormatsController,
  createPromptTemplateController,
  optimizePromptController,
  getPromptTemplatesController,
  createCollaborationRoomController,
  lockSceneElementController,
  getRoomPresenceController,
  addScriptBranchNodeController,
  getScriptBranchTreeController,
  traverseScriptChoicesController,
  logAnalyticsEventController,
  getRetentionHeatmapController,
  runABExperimentController,
  runMasterPipelineController
} from './storytelling.controller';

export const storytellingRouter = Router();

// Scripts & Research
storytellingRouter.post('/content/:id/script', generateScriptController);
storytellingRouter.get('/content/:id/characters', getCharactersController);
storytellingRouter.get('/content/:id/narrator', getNarratorController);

// Scene Beats
storytellingRouter.post('/scripts/:id/segment', segmentScriptController);
storytellingRouter.get('/scripts/:id/scenes', getScenesController);
storytellingRouter.put('/scripts/:id/scenes/:sceneId', updateSceneBeatController);

// Character Visuals
storytellingRouter.post('/characters/:id/visuals', generateCharacterVisualsController);
storytellingRouter.get('/characters/:id/bible', getCharacterBibleController);
storytellingRouter.put('/characters/:id/avatar', updateCharacterAvatarController);

// Styles & Environments
storytellingRouter.get('/styles', getStylePresetsController);
storytellingRouter.post('/styles/preset', createStylePresetController);
storytellingRouter.post('/environments/generate', generateEnvironmentRefController);

// Keyframe Images
storytellingRouter.post('/scenes/:id/generate-image', generateSceneImageController);
storytellingRouter.post('/scenes/batch-generate', startBatchImageGenerationController);
storytellingRouter.get('/jobs/images/:jobId', getImageJobStatusController);

// Voice Synthesis
storytellingRouter.post('/narrator/synthesize', synthesizeNarratorController);
storytellingRouter.post('/dialogue/synthesize', synthesizeDialogueController);
storytellingRouter.get('/voices/catalog', getVoiceCatalogController);

// Soundtrack & SFX
storytellingRouter.post('/audio/recommend-music', recommendMusicController);
storytellingRouter.post('/audio/mix', mixAudioController);
storytellingRouter.get('/audio/sfx-catalog', getSFXCatalogController);

// Video Motion
storytellingRouter.post('/scenes/:id/generate-video', generateSceneVideoController);
storytellingRouter.get('/jobs/video/:jobId', getVideoJobStatusController);
storytellingRouter.post('/scenes/:id/motion-settings', updateMotionSettingsController);

// Multi-track Timeline
storytellingRouter.post('/timeline/sync', syncTimelineController);
storytellingRouter.get('/timeline/:scriptId', getTimelineController);
storytellingRouter.put('/timeline/clips/:clipId', updateTimelineClipController);

// Subtitles
storytellingRouter.post('/subtitles/generate', generateSubtitlesController);
storytellingRouter.post('/subtitles/translate', translateSubtitlesController);
storytellingRouter.get('/subtitles/export/:scriptId', exportSubtitlesController);

// Render Engine
storytellingRouter.post('/render/start', startRenderJobController);
storytellingRouter.get('/render/:jobId', getRenderJobStatusController);
storytellingRouter.post('/render/:jobId/cancel', cancelRenderJobController);

// Queue & Webhooks
storytellingRouter.post('/queue/jobs', enqueueJobController);
storytellingRouter.get('/queue/jobs/:id', getJobStatusController);
storytellingRouter.post('/webhooks/register', registerWebhookController);

// Social Export
storytellingRouter.post('/export/social', exportSocialVideoController);
storytellingRouter.get('/export/formats', getExportFormatsController);

// Prompt Engineering Lab
storytellingRouter.post('/prompts/templates', createPromptTemplateController);
storytellingRouter.post('/prompts/optimize', optimizePromptController);
storytellingRouter.get('/prompts/templates', getPromptTemplatesController);

// Collaboration
storytellingRouter.post('/collaboration/rooms', createCollaborationRoomController);
storytellingRouter.post('/collaboration/rooms/:id/lock', lockSceneElementController);
storytellingRouter.get('/collaboration/rooms/:id/presence', getRoomPresenceController);

// Branching Engine
storytellingRouter.post('/scripts/:id/branches', addScriptBranchNodeController);
storytellingRouter.get('/scripts/:id/tree', getScriptBranchTreeController);
storytellingRouter.post('/scripts/:id/choices', traverseScriptChoicesController);

// Analytics
storytellingRouter.post('/analytics/events', logAnalyticsEventController);
storytellingRouter.get('/analytics/heatmaps/:scriptId', getRetentionHeatmapController);
storytellingRouter.post('/analytics/experiments', runABExperimentController);

// Master Pipeline Orchestration
storytellingRouter.post('/pipeline/run', runMasterPipelineController);
