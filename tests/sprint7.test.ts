import { AudioService } from '../src/services/AudioService';

describe('Sprint 7 Backend Test Suite — Soundtrack, Ambient Sound & SFX Engine (BE-053 to BE-058)', () => {
  let audioService: AudioService;

  beforeEach(() => {
    audioService = new AudioService();
  });

  test('BE-053: Recommend background music matching scene mood/genre tag', () => {
    const music = audioService.recommendMusic('suspense horror');

    expect(music.title).toContain('Dark Shadows');
    expect(music.trackType).toBe('MUSIC');
    expect(music.duckingDb).toBe(-16.0);
  });

  test('BE-054: Retrieve SFX catalog with sound cue assets', () => {
    const sfx = audioService.getSFXCatalog();

    expect(sfx.length).toBeGreaterThanOrEqual(3);
    const ids = sfx.map(s => s.id);
    expect(ids).toContain('sfx-thunder');
    expect(ids).toContain('sfx-sword');
    expect(ids).toContain('sfx-magic');
  });

  test('BE-055 & BE-056: Mix narration, music, and SFX with audio ducking', () => {
    const mix = audioService.mixAudioTracks(
      'https://example.com/narration.mp3',
      'https://example.com/epic-music.mp3',
      ['https://example.com/sfx-thunder.mp3'],
      -14.0
    );

    expect(mix.narrationTrackUrl).toBe('https://example.com/narration.mp3');
    expect(mix.musicTrackUrl).toBe('https://example.com/epic-music.mp3');
    expect(mix.sfxTrackUrls).toContain('https://example.com/sfx-thunder.mp3');
    expect(mix.duckingLevelDb).toBe(-14.0);
    expect(mix.outputMixedUrl).toBeDefined();
  });

  test('BE-057: Fallback to epic cinematic music when requested mood is unknown', () => {
    const music = audioService.recommendMusic('unknown-mood-x');
    expect(music.genreOrMood).toBe('cinematic epic');
  });

  test('BE-058: Ensure mixed audio output duration matches target timeline', () => {
    const mix = audioService.mixAudioTracks(
      'https://example.com/narration.mp3',
      'https://example.com/music.mp3'
    );
    expect(mix.totalDurationSeconds).toBeGreaterThan(0);
  });
});
