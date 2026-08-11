import { TimelineItem, TimelineTrackItem, TimelineClipItem } from '../types';

export class TimelineService {
  private timelinesStore: Map<string, TimelineItem> = new Map();

  async syncScriptTimeline(
    scriptId: string,
    sceneClips: Array<{ id: string; duration: number; videoUrl: string; label: string }>,
    narrationClips: Array<{ id: string; duration: number; audioUrl: string; label: string }>,
    musicTrackUrl?: string
  ): Promise<TimelineItem> {
    console.log(`[TimelineService] Building multi-track synced timeline for script '${scriptId}'`);

    let videoStartTime = 0;
    const videoClips: TimelineClipItem[] = sceneClips.map(c => {
      const clip: TimelineClipItem = {
        id: `clip-vid-${c.id}`,
        clipType: 'VIDEO',
        startTimeSeconds: videoStartTime,
        durationSeconds: c.duration,
        assetUrl: c.videoUrl,
        label: c.label
      };
      videoStartTime += c.duration;
      return clip;
    });

    let audioStartTime = 0;
    const narrationClipsList: TimelineClipItem[] = narrationClips.map(n => {
      const clip: TimelineClipItem = {
        id: `clip-aud-${n.id}`,
        clipType: 'AUDIO_NARRATION',
        startTimeSeconds: audioStartTime,
        durationSeconds: n.duration,
        assetUrl: n.audioUrl,
        label: n.label
      };
      audioStartTime += n.duration;
      return clip;
    });

    const totalDuration = Math.max(videoStartTime, audioStartTime);

    const tracks: TimelineTrackItem[] = [
      {
        id: 'track-v1',
        name: 'Video Track 1',
        trackType: 'VIDEO',
        layerOrder: 1,
        clips: videoClips
      },
      {
        id: 'track-a1',
        name: 'Narration Track',
        trackType: 'AUDIO',
        layerOrder: 2,
        clips: narrationClipsList
      }
    ];

    if (musicTrackUrl) {
      tracks.push({
        id: 'track-a2',
        name: 'Background Music',
        trackType: 'AUDIO',
        layerOrder: 3,
        clips: [
          {
            id: 'clip-music-bg',
            clipType: 'AUDIO_MUSIC',
            startTimeSeconds: 0,
            durationSeconds: totalDuration,
            assetUrl: musicTrackUrl,
            label: 'Background Music'
          }
        ]
      });
    }

    const timeline: TimelineItem = {
      id: `tl-${scriptId}`,
      scriptId,
      tracks,
      totalDuration: Math.round(totalDuration * 10) / 10,
      fps: 30
    };

    this.timelinesStore.set(scriptId, timeline);
    return timeline;
  }

  async getTimelineByScriptId(scriptId: string): Promise<TimelineItem | null> {
    return this.timelinesStore.get(scriptId) || null;
  }

  async updateClipSettings(
    scriptId: string,
    clipId: string,
    startTimeSeconds: number,
    durationSeconds: number
  ): Promise<TimelineClipItem | null> {
    const timeline = this.timelinesStore.get(scriptId);
    if (!timeline) {
      return null;
    }

    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.id === clipId) {
          clip.startTimeSeconds = startTimeSeconds;
          clip.durationSeconds = durationSeconds;
          return clip;
        }
      }
    }
    return null;
  }

  detectAudioVisualDrift(timeline: TimelineItem): { hasDrift: boolean; driftSeconds: number } {
    const videoTrack = timeline.tracks.find(t => t.trackType === 'VIDEO');
    const audioTrack = timeline.tracks.find(t => t.id === 'track-a1');

    if (!videoTrack || !audioTrack) {
      return { hasDrift: false, driftSeconds: 0 };
    }

    const videoDuration = videoTrack.clips.reduce((acc, c) => acc + c.durationSeconds, 0);
    const audioDuration = audioTrack.clips.reduce((acc, c) => acc + c.durationSeconds, 0);
    const diff = Math.abs(videoDuration - audioDuration);

    return {
      hasDrift: diff > 0.5,
      driftSeconds: Math.round(diff * 10) / 10
    };
  }
}
