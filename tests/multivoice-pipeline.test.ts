import { groupSentenceSegments } from '../src/services/EmotionAnalysisService';
import { EmotionEngineTTSProvider } from '../src/services/tts/EmotionEngineTTSProvider';
import { EmotionEngineSegment } from '../src/services/EmotionEngineClient';
import { EmotionMapResult } from '../src/types';

describe('multi-voice pipeline', () => {
  test('groupSentenceSegments never merges different speakers', () => {
    const eeSegments: EmotionEngineSegment[] = [
      { speaker: 'Virus', text: 'Life is a race.', emotion: 'neutral', intensity: 0.3, role: 'adult_male' },
      { speaker: 'Rancho', text: 'Pursue excellence.', emotion: 'neutral', intensity: 0.3, role: 'adult_male' },
      { speaker: 'Pia', text: 'Do you ever worry?', emotion: 'fear', intensity: 0.7, role: 'adult_female' },
      { speaker: 'Pia', text: 'Then stay honest.', emotion: 'neutral', intensity: 0.3, role: 'adult_female' },
    ];

    const grouped = groupSentenceSegments(eeSegments);

    expect(grouped).toHaveLength(4);
    expect(grouped[0].speaker).toBe('Virus');
    expect(grouped[0].role).toBe('adult_male');
    expect(grouped[1].speaker).toBe('Rancho');
    expect(grouped[2].speaker).toBe('Pia');
    expect(grouped[3].speaker).toBe('Pia');
    expect(grouped.map((g) => g.speaker)).not.toContain('Virus-Rancho');
  });

  test('buildSegmentsFromEmotionMap preserves speaker and role per segment', () => {
    const emotionMap: EmotionMapResult = {
      language: 'en',
      overallMood: 'test',
      segments: [
        {
          segmentIndex: 1,
          text: 'Virus declared his philosophy.',
          emotion: 'CALM',
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'narrator',
          role: 'adult_female',
        },
        {
          segmentIndex: 2,
          text: 'Life is a race.',
          emotion: 'CALM',
          intensity: 0.3,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'Virus',
          role: 'adult_male',
        },
        {
          segmentIndex: 3,
          text: 'Do you ever worry?',
          emotion: 'SUSPENSEFUL',
          intensity: 0.7,
          pace: 1.1,
          pitch: 1,
          volume: 1,
          pauseStyle: 'DRAMATIC',
          speaker: 'Pia',
          role: 'adult_female',
        },
      ],
    };

    const narrateSegments = EmotionEngineTTSProvider.buildSegmentsFromEmotionMap(emotionMap, 'adult_female');

    expect(narrateSegments.map((s) => s.speaker)).toEqual(['narrator', 'Virus', 'Pia']);
    expect(narrateSegments.map((s) => s.role)).toEqual(['adult_female', 'adult_male', 'adult_female']);
    expect(new Set(narrateSegments.map((s) => s.role)).size).toBeGreaterThan(1);
  });
});
