import {
  buildEmotionEngineCharacterMap,
  buildEmotionEngineCharacterVoiceMap,
  expandSpeakerAliases,
} from '../src/services/emotionCharacterMap';
import { CharacterItem } from '../src/types';

describe('emotionCharacterMap voice diversification', () => {
  test('assigns distinct male voices when 2+ adult_male characters', () => {
    const roles = buildEmotionEngineCharacterMap([
      { name: 'Rancho', genderPresentation: 'MALE', ageGroup: 'ADULT' } as CharacterItem,
      { name: 'Virus', genderPresentation: 'MALE', ageGroup: 'ADULT' } as CharacterItem,
      { name: 'Farhan', genderPresentation: 'MALE', ageGroup: 'ADULT' } as CharacterItem,
    ]);
    const voices = buildEmotionEngineCharacterVoiceMap(roles, 'en');
    expect(Object.keys(voices).length).toBe(3);
    expect(new Set(Object.values(voices)).size).toBeGreaterThanOrEqual(2);
  });

  test('skips diversification for single-character role bucket', () => {
    const roles = { Rancho: 'adult_male', narrator: 'adult_female' };
    expect(buildEmotionEngineCharacterVoiceMap(roles, 'en')).toEqual({});
  });

  test('skips diversification for Hindi', () => {
    const roles = { Rancho: 'adult_male', Virus: 'adult_male' };
    expect(buildEmotionEngineCharacterVoiceMap(roles, 'hi')).toEqual({});
  });

  test('expandSpeakerAliases maps Khan to Shere Khan adult_male role', () => {
    const roles = buildEmotionEngineCharacterMap([
      { name: 'Shere Khan', genderPresentation: 'MALE', ageGroup: 'ADULT' } as CharacterItem,
      { name: 'Akela', genderPresentation: 'MALE', ageGroup: 'ELDER' } as CharacterItem,
    ]);
    expect(roles['Shere Khan']).toBe('adult_male');
    expect(roles['Khan']).toBe('adult_male');
    expect(roles['Akela']).toBe('elderly_male');

    const expanded = expandSpeakerAliases({ 'Shere Khan': 'adult_male' });
    expect(expanded.Khan).toBe('adult_male');
  });
});
