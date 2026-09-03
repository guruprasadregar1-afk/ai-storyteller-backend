import { buildEmotionEngineCharacterMap } from '../src/services/emotionCharacterMap';
import { mapNarratorToVoiceRole } from '../src/services/tts/EmotionEngineTTSProvider';

describe('narrator voice role mapping', () => {
  test('mapNarratorToVoiceRole does not treat FEMALE as MALE substring', () => {
    expect(mapNarratorToVoiceRole({ genderPresentation: 'FEMALE', ageGroup: 'ADULT' } as any)).toBe('adult_female');
    expect(mapNarratorToVoiceRole({ genderPresentation: 'MALE', ageGroup: 'ADULT' } as any)).toBe('adult_male');
  });

  test('buildEmotionEngineCharacterMap injects narrator role for EE /tag', () => {
    const map = buildEmotionEngineCharacterMap([], 'adult_male');
    expect(map.narrator).toBe('adult_male');
  });
});
