import { AudioTrackItem, AudioMixConfig } from '../types';

export class AudioService {
  private musicCatalog: Map<string, AudioTrackItem> = new Map();
  private sfxCatalog: Map<string, AudioTrackItem> = new Map();

  constructor() {
    this.seedAudioCatalogs();
  }

  getSFXCatalog(): AudioTrackItem[] {
    return Array.from(this.sfxCatalog.values());
  }

  recommendMusic(moodOrGenre: string): AudioTrackItem {
    console.log(`[AudioService] Recommending background music for mood/genre: '${moodOrGenre}'`);
    const key = moodOrGenre.toLowerCase();

    for (const [mKey, track] of this.musicCatalog.entries()) {
      if (key.includes(mKey) || mKey.includes(key)) {
        return track;
      }
    }

    return this.musicCatalog.get('cinematic epic')!;
  }

  mixAudioTracks(
    narrationUrl: string,
    musicUrl: string,
    sfxUrls: string[] = [],
    duckingDb = -14.0
  ): AudioMixConfig {
    console.log(`[AudioService] Mixing audio tracks with ducking level ${duckingDb}dB`);

    return {
      narrationTrackUrl: narrationUrl,
      musicTrackUrl: musicUrl,
      sfxTrackUrls: sfxUrls,
      duckingLevelDb: duckingDb,
      outputMixedUrl: `https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg`,
      totalDurationSeconds: 15.0
    };
  }

  private seedAudioCatalogs() {
    const musicTracks: AudioTrackItem[] = [
      {
        id: 'track-epic',
        title: 'Rising Kingdom (Epic Orchestral)',
        trackType: 'MUSIC',
        genreOrMood: 'cinematic epic',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
        durationSeconds: 120,
        duckingDb: -14.0
      },
      {
        id: 'track-suspense',
        title: 'Dark Shadows (Suspense Thriller)',
        trackType: 'MUSIC',
        genreOrMood: 'suspense horror',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
        durationSeconds: 120,
        duckingDb: -16.0
      },
      {
        id: 'track-playful',
        title: 'Sunny Morning (Playful Whimsical)',
        trackType: 'MUSIC',
        genreOrMood: 'playful children',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg',
        durationSeconds: 90,
        duckingDb: -10.0
      }
    ];

    for (const m of musicTracks) {
      this.musicCatalog.set(m.genreOrMood.toLowerCase(), m);
    }

    const sfxTracks: AudioTrackItem[] = [
      {
        id: 'sfx-thunder',
        title: 'Thunder Clatter',
        trackType: 'SFX',
        genreOrMood: 'weather',
        audioUrl: 'https://actions.google.com/sounds/v1/weather/thunder.ogg',
        durationSeconds: 3.5,
        duckingDb: -6.0
      },
      {
        id: 'sfx-sword',
        title: 'Sword Clash',
        trackType: 'SFX',
        genreOrMood: 'action',
        audioUrl: 'https://actions.google.com/sounds/v1/impacts/metal_impact.ogg',
        durationSeconds: 1.2,
        duckingDb: -4.0
      },
      {
        id: 'sfx-magic',
        title: 'Magic Spell Whoosh',
        trackType: 'SFX',
        genreOrMood: 'fantasy',
        audioUrl: 'https://actions.google.com/sounds/v1/science_fiction/whoosh.ogg',
        durationSeconds: 2.0,
        duckingDb: -6.0
      }
    ];

    for (const s of sfxTracks) {
      this.sfxCatalog.set(s.id!, s);
    }
  }
}
