import { Request, Response } from 'express';
import { AudioService } from '../../../services/AudioService';

const audioService = new AudioService();

export async function recommendMusicController(req: Request, res: Response) {
  const { moodOrGenre } = req.body;
  const music = audioService.recommendMusic(moodOrGenre || 'cinematic');
  res.json({ success: true, music });
}

export async function mixAudioController(req: Request, res: Response) {
  const { narrationTrackUrl, musicTrackUrl, duckingLevelDb } = req.body;
  const mix = audioService.mixAudioTracks({
    narrationTrackUrl,
    musicTrackUrl,
    duckingLevelDb: duckingLevelDb || -14,
    outputMixedUrl: `https://cdn.ai-storyteller.internal/audio/mixed-${Date.now()}.mp3`,
    totalDurationSeconds: 60
  });
  res.json({ success: true, mix });
}

export async function getSFXCatalogController(req: Request, res: Response) {
  const sfx = audioService.getSFXCatalog();
  res.json({ success: true, sfx });
}
