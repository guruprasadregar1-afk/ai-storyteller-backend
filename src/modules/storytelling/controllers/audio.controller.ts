import { Request, Response } from 'express';
import { AudioService } from '../../../services/AudioService';

const audioService = new AudioService();

export async function recommendMusicController(req: Request, res: Response) {
  const { moodOrGenre } = req.body;
  const music = audioService.recommendMusic(moodOrGenre || 'cinematic');
  res.json({ success: true, music });
}

export async function mixAudioController(req: Request, res: Response) {
  const { narrationTrackUrl, musicTrackUrl, sfxTrackUrls, duckingLevelDb } = req.body;
  const mix = audioService.mixAudioTracks(
    narrationTrackUrl || 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
    musicTrackUrl || 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
    sfxTrackUrls || [],
    duckingLevelDb || -14
  );
  res.json({ success: true, mix });
}

export async function getSFXCatalogController(req: Request, res: Response) {
  const sfx = audioService.getSFXCatalog();
  res.json({ success: true, sfx });
}
