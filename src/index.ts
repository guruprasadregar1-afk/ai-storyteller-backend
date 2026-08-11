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
  getAIHealth
} from './controllers/contentController';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/content/analyze', analyzeContent);
app.get('/api/content/search', searchContent);
app.get('/api/content/:id', getContentById);
app.post('/api/content/:id/research', researchContent);
app.post('/api/content/:id/script', generateScript);
app.get('/api/content/:id/characters', getCharacters);
app.get('/api/content/:id/narrator', getNarrator);
app.get('/api/ai/providers/health', getAIHealth);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'AI Storyteller Backend', version: '1.0.0' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 AI Storyteller Backend running on http://localhost:${PORT}`);
  });
}
