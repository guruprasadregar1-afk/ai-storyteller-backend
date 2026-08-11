import { TimelineService } from '../src/services/TimelineService';

describe('Sprint 9 Backend Test Suite — Multi-Track Timeline & Audio-Visual Sync (BE-066 to BE-072)', () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    timelineService = new TimelineService();
  });

  test('BE-066 & BE-071: Build multi-track synced timeline with video, narration & music', async () => {
    const sceneClips = [
      { id: '1', duration: 4.0, videoUrl: 'http://example.com/v1.mp4', label: 'Scene 1' },
      { id: '2', duration: 4.0, videoUrl: 'http://example.com/v2.mp4', label: 'Scene 2' }
    ];
    const narrationClips = [
      { id: '1', duration: 3.5, audioUrl: 'http://example.com/a1.mp3', label: 'Narration 1' },
      { id: '2', duration: 4.5, audioUrl: 'http://example.com/a2.mp3', label: 'Narration 2' }
    ];

    const timeline = await timelineService.syncScriptTimeline('script-901', sceneClips, narrationClips, 'http://example.com/music.mp3');

    expect(timeline.scriptId).toBe('script-901');
    expect(timeline.tracks.length).toBe(3); // Video, Narration, Music
    expect(timeline.totalDuration).toBeGreaterThan(0);
  });

  test('BE-067: Fetch timeline by scriptId', async () => {
    await timelineService.syncScriptTimeline('script-902', [{ id: '1', duration: 5.0, videoUrl: 'http://example.com/v.mp4', label: 'Scene 1' }], []);
    const fetched = await timelineService.getTimelineByScriptId('script-902');

    expect(fetched).not.toBeNull();
    expect(fetched?.scriptId).toBe('script-902');
  });

  test('BE-068: Trim/update clip settings in timeline', async () => {
    const timeline = await timelineService.syncScriptTimeline('script-903', [{ id: '10', duration: 5.0, videoUrl: 'http://example.com/v.mp4', label: 'Scene 10' }], []);
    const clipId = timeline.tracks[0].clips[0].id;

    const updated = await timelineService.updateClipSettings('script-903', clipId, 1.0, 3.5);

    expect(updated).not.toBeNull();
    expect(updated?.startTimeSeconds).toBe(1.0);
    expect(updated?.durationSeconds).toBe(3.5);
  });

  test('BE-069: Detect audio-visual duration drift between video and narration tracks', async () => {
    const sceneClips = [{ id: '1', duration: 10.0, videoUrl: 'http://example.com/v1.mp4', label: 'Scene 1' }];
    const narrationClips = [{ id: '1', duration: 4.0, audioUrl: 'http://example.com/a1.mp3', label: 'Narration 1' }];

    const timeline = await timelineService.syncScriptTimeline('script-904', sceneClips, narrationClips);
    const drift = timelineService.detectAudioVisualDrift(timeline);

    expect(drift.hasDrift).toBe(true);
    expect(drift.driftSeconds).toBe(6.0);
  });

  test('BE-070: Ensure track layer ordering is preserved (Video=1, Narration=2, Music=3)', async () => {
    const timeline = await timelineService.syncScriptTimeline('script-905', [], [], 'http://example.com/music.mp3');

    const videoTrack = timeline.tracks.find(t => t.trackType === 'VIDEO');
    const narrationTrack = timeline.tracks.find(t => t.id === 'track-a1');
    const musicTrack = timeline.tracks.find(t => t.id === 'track-a2');

    expect(videoTrack?.layerOrder).toBe(1);
    expect(narrationTrack?.layerOrder).toBe(2);
    expect(musicTrack?.layerOrder).toBe(3);
  });

  test('BE-072: Return null when querying non-existent script timeline', async () => {
    const nonExistent = await timelineService.getTimelineByScriptId('script-invalid-999');
    expect(nonExistent).toBeNull();
  });
});
