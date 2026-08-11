import { Request, Response } from 'express';
import { TimelineService } from '../../../services/TimelineService';

const timelineService = new TimelineService();

export async function syncTimelineController(req: Request, res: Response) {
  const { scriptId, sceneClips, narrationClips, musicTrackUrl } = req.body;
  const timeline = await timelineService.syncScriptTimeline(scriptId, sceneClips || [], narrationClips || [], musicTrackUrl);
  res.json({ success: true, timeline });
}

export async function getTimelineController(req: Request, res: Response) {
  const { scriptId } = req.params;
  const timeline = timelineService.getTimeline(scriptId);
  res.json({ success: true, timeline });
}

export async function updateTimelineClipController(req: Request, res: Response) {
  const { clipId } = req.params;
  const { startTimeSeconds, durationSeconds } = req.body;
  const updated = timelineService.updateClipPosition(clipId, startTimeSeconds, durationSeconds);
  res.json({ success: true, clip: updated });
}
