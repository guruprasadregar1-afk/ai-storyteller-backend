import { SubtitleService } from '../src/services/SubtitleService';

describe('Sprint 10 Backend Test Suite — Subtitle, Captioning & Multilingual Translation (BE-073 to BE-078)', () => {
  let subtitleService: SubtitleService;

  beforeEach(() => {
    subtitleService = new SubtitleService();
  });

  test('BE-073: Generate English subtitle cues with start & end timestamps', async () => {
    const beats = [
      { text: 'In the heart of the ancient city...', startTime: 0.0, duration: 4.0, speaker: 'Narrator' },
      { text: 'We must make our final stand!', startTime: 4.2, duration: 3.5, speaker: 'Hero' }
    ];

    const sub = await subtitleService.generateSubtitles('script-1001', beats);

    expect(sub.scriptId).toBe('script-1001');
    expect(sub.language).toBe('English');
    expect(sub.cues.length).toBe(2);
    expect(sub.cues[0].endTimeSeconds).toBe(4.0);
    expect(sub.cues[1].speaker).toBe('Hero');
  });

  test('BE-074: Export valid SRT format string', async () => {
    const beats = [{ text: 'Test narration text', startTime: 1.0, duration: 3.0 }];
    const sub = await subtitleService.generateSubtitles('script-1002', beats);

    const srt = subtitleService.generateSRT(sub.cues);
    expect(srt).toContain('1');
    expect(srt).toContain('00:00:01,000 --> 00:00:04,000');
    expect(srt).toContain('Test narration text');
  });

  test('BE-075: Export valid WebVTT format string with speaker tags', async () => {
    const beats = [{ text: 'Advance to the gate!', startTime: 0.0, duration: 2.5, speaker: 'Captain' }];
    const sub = await subtitleService.generateSubtitles('script-1003', beats);

    const vtt = subtitleService.generateVTT(sub.cues);
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00.000 --> 00:02.500');
    expect(vtt).toContain('<v Captain>Advance to the gate!</v>');
  });

  test('BE-076: Translate English subtitles to Hindi & Spanish', async () => {
    const beats = [{ text: 'Welcome to the future', startTime: 0.0, duration: 3.0 }];
    await subtitleService.generateSubtitles('script-1004', beats, 'English');

    const hindiSub = await subtitleService.translateSubtitles('script-1004', 'Hindi');
    expect(hindiSub).not.toBeNull();
    expect(hindiSub?.language).toBe('Hindi');
    expect(hindiSub?.cues[0].text).toContain('[HINDI]');
  });

  test('BE-077: Fetch existing subtitle record by script ID and language', async () => {
    await subtitleService.generateSubtitles('script-1005', [{ text: 'Sample text', startTime: 0, duration: 2 }], 'French');
    const fetched = subtitleService.getSubtitles('script-1005', 'French');

    expect(fetched).not.toBeNull();
    expect(fetched?.language).toBe('French');
  });

  test('BE-078: Return null when attempting to translate non-existent script subtitles', async () => {
    const nullResult = await subtitleService.translateSubtitles('script-invalid-999', 'Japanese');
    expect(nullResult).toBeNull();
  });
});
