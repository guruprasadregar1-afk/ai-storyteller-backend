import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  analyzeContent,
  searchContent,
  getContentById,
  researchContent,
  generateScript,
  getCharacters,
  getNarrator,
  getAIHealth,
  segmentScriptBeats,
  getScriptScenes,
  updateScriptSceneBeat,
  generateCharacterVisualsController,
  getCharacterVisualBibleController,
  updateCharacterAvatarController,
  getStylePresetsController,
  createStylePresetController,
  generateEnvironmentRefController,
  generateSceneImageController,
  batchGenerateImagesController,
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
  createCollabRoomController,
  lockCollabElementController,
  getCollabPresenceController,
  addScriptBranchController,
  getScriptBranchTreeController,
  traverseScriptChoicesController,
  createWorkspaceController,
  addWorkspaceMemberController,
  checkWorkspacePermissionsController,
  getSubscriptionController,
  createCheckoutSessionController,
  getUsageController
} from './controllers/contentController';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes - Sprint 1
app.post('/api/content/analyze', analyzeContent);
app.get('/api/content/search', searchContent);
app.get('/api/content/:id', getContentById);
app.post('/api/content/:id/research', researchContent);
app.post('/api/content/:id/script', generateScript);
app.get('/api/content/:id/characters', getCharacters);
app.get('/api/content/:id/narrator', getNarrator);
app.get('/api/ai/providers/health', getAIHealth);

// API Routes - Sprint 2
app.post('/api/scripts/:id/segment', segmentScriptBeats);
app.get('/api/scripts/:id/scenes', getScriptScenes);
app.put('/api/scripts/:id/scenes/:sceneId', updateScriptSceneBeat);

// API Routes - Sprint 3
app.post('/api/characters/:id/visuals', generateCharacterVisualsController);
app.get('/api/characters/:id/bible', getCharacterVisualBibleController);
app.put('/api/characters/:id/avatar', updateCharacterAvatarController);

// API Routes - Sprint 4
app.get('/api/styles', getStylePresetsController);
app.post('/api/styles/preset', createStylePresetController);
app.post('/api/environments/generate', generateEnvironmentRefController);

// API Routes - Sprint 5
app.post('/api/scenes/:id/generate-image', generateSceneImageController);
app.post('/api/scenes/batch-generate', batchGenerateImagesController);
app.get('/api/jobs/images/:jobId', getImageJobStatusController);

// API Routes - Sprint 6
app.post('/api/narrator/synthesize', synthesizeNarratorController);
app.post('/api/dialogue/synthesize', synthesizeDialogueController);
app.get('/api/voices/catalog', getVoiceCatalogController);

// API Routes - Sprint 7
app.post('/api/audio/recommend-music', recommendMusicController);
app.post('/api/audio/mix', mixAudioController);
app.get('/api/audio/sfx-catalog', getSFXCatalogController);

// API Routes - Sprint 8
app.post('/api/scenes/:id/generate-video', generateSceneVideoController);
app.get('/api/jobs/video/:jobId', getVideoJobStatusController);
app.post('/api/scenes/:id/motion-settings', updateMotionSettingsController);

// API Routes - Sprint 9
app.post('/api/timeline/sync', syncTimelineController);
app.get('/api/timeline/:scriptId', getTimelineController);
app.put('/api/timeline/clips/:clipId', updateTimelineClipController);

// API Routes - Sprint 10
app.post('/api/subtitles/generate', generateSubtitlesController);
app.post('/api/subtitles/translate', translateSubtitlesController);
app.get('/api/subtitles/export/:scriptId', exportSubtitlesController);

// API Routes - Sprint 11
app.post('/api/render/start', startRenderJobController);
app.get('/api/render/:jobId', getRenderJobStatusController);
app.post('/api/render/:jobId/cancel', cancelRenderJobController);

// API Routes - Sprint 12
app.post('/api/queue/jobs', enqueueJobController);
app.get('/api/queue/jobs/:id', getJobStatusController);
app.post('/api/webhooks/register', registerWebhookController);

// API Routes - Sprint 13
app.post('/api/export/social', exportSocialVideoController);
app.get('/api/export/formats', getExportFormatsController);

// API Routes - Sprint 14
app.post('/api/prompts/templates', createPromptTemplateController);
app.post('/api/prompts/optimize', optimizePromptController);
app.get('/api/prompts/templates', getPromptTemplatesController);

// API Routes - Sprint 15
app.post('/api/collaboration/rooms', createCollabRoomController);
app.post('/api/collaboration/rooms/:id/lock', lockCollabElementController);
app.get('/api/collaboration/rooms/:id/presence', getCollabPresenceController);

// API Routes - Sprint 16
app.post('/api/scripts/:id/branches', addScriptBranchController);
app.get('/api/scripts/:id/tree', getScriptBranchTreeController);
app.post('/api/scripts/:id/choices', traverseScriptChoicesController);

// API Routes - Sprint 17
app.post('/api/workspaces', createWorkspaceController);
app.post('/api/workspaces/:id/members', addWorkspaceMemberController);
app.get('/api/workspaces/:id/permissions', checkWorkspacePermissionsController);

// API Routes - Sprint 18
app.get('/api/billing/subscription', getSubscriptionController);
app.post('/api/billing/checkout', createCheckoutSessionController);
app.get('/api/billing/usage', getUsageController);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'AI Storyteller Backend', version: '1.0.0' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 AI Storyteller Backend running on http://localhost:${PORT}`);
  });
}
