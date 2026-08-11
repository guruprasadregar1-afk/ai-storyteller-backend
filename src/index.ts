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
  updateCharacterAvatarController
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

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'AI Storyteller Backend', version: '1.0.0' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 AI Storyteller Backend running on http://localhost:${PORT}`);
  });
}
