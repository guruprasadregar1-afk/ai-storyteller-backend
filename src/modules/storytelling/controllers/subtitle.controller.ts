import { Request, Response } from 'express';
import { SubtitleService } from '../../../services/SubtitleService';

const subtitleService = new SubtitleService();

export async function generateSubtitlesController(req: Request, res: Response) {
  const { scriptId, narrationBeats, language } = req.body;
  const subtitles = await subtitleService.generateSubtitles(scriptId, narrationBeats || [], language || 'English');
  res.json({ success: true, subtitles });
}

export async function translateSubtitlesController(req: Request, res: Response) {
  const { scriptId, targetLanguage } = req.body;
  const translated = await subtitleService.translateSubtitles(scriptId, targetLanguage);
  res.json({ success: true, subtitles: translated });
}

export async function exportSubtitlesController(req: Request, res: Response) {
  const { scriptId } = req.params;
  const language = (req.query.language as string) || 'English';
  const format = (req.query.format as 'srt' | 'vtt') || 'vtt';
  const subtitle = subtitleService.getSubtitles(scriptId, language) || { cues: [{ startTimeSeconds: 0, endTimeSeconds: 5, text: 'Sample Subtitle' }] };
  const fileContent = format === 'vtt' ? subtitleService.generateVTT(subtitle.cues) : subtitleService.generateSRT(subtitle.cues);
  res.setHeader('Content-Type', format === 'vtt' ? 'text/vtt' : 'application/x-subrip');
  res.send(fileContent);
}
