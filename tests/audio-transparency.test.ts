import {
  buildPublicAudioResponse,
  inferGenderFromVoice,
  normalizeGender,
} from '../src/common/utils/audio-response.util';
import { StoryAudioRecord } from '../src/services/StoryAudioService';

function mockAudio(overrides: Partial<StoryAudioRecord> = {}): StoryAudioRecord {
  return {
    id: 'audio-test',
    storyScriptId: 'story-1',
    provider: 'emotion-engine',
    voiceId: 'en_US-ryan-medium',
    voiceName: 'Adult Male (English)',
    language: 'English',
    audioUrl: 'http://localhost:8000/audio/test.mp3',
    duration: 12.5,
    format: 'mp3',
    status: 'READY',
    emotionAware: true,
    genderUsed: 'MALE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('audio transparency response', () => {
  test('buildPublicAudioResponse exposes provider, voiceId, voiceName, genderUsed', () => {
    const audio = mockAudio();
    const payload = buildPublicAudioResponse(audio, 'English', 'MALE');

    expect(payload.provider).toBe('emotion-engine');
    expect(payload.voiceId).toBe('en_US-ryan-medium');
    expect(payload.voiceName).toBe('Adult Male (English)');
    expect(payload.genderUsed).toBe('MALE');
    expect(payload.voiceMismatch).toBe(false);
    expect(payload.url).toContain('.mp3');
  });

  test('inferGenderFromVoice detects male and female Piper voice ids', () => {
    expect(inferGenderFromVoice('en_US-ryan-medium', 'Adult Male')).toBe('MALE');
    expect(inferGenderFromVoice('en_US-amy-medium', 'Adult Female')).toBe('FEMALE');
    expect(inferGenderFromVoice('hi_IN-rohan-medium', 'Hindi Male')).toBe('MALE');
    expect(inferGenderFromVoice('hi_IN-priyamvada-medium', 'Hindi Female')).toBe('FEMALE');
  });

  test('voiceMismatch flags when narrator gender differs from synthesized gender', () => {
    const audio = mockAudio({
      provider: 'default-tts',
      voiceId: 'default-narrator-voice',
      voiceName: 'Default Narration (Hindi)',
      genderUsed: 'FEMALE',
    });

    const payload = buildPublicAudioResponse(audio, 'Hindi', 'MALE');

    expect(payload.genderUsed).toBe('FEMALE');
    expect(normalizeGender('MALE')).toBe('MALE');
    expect(payload.voiceMismatch).toBe(true);
  });

  test('regression: silent gender mismatch must be detectable from API fields', () => {
    const narratorGender = 'MALE';
    const audio = mockAudio({
      provider: 'default-tts',
      voiceName: 'Default Narration (Hindi)',
      genderUsed: 'FEMALE',
    });

    const payload = buildPublicAudioResponse(audio, 'Hindi', narratorGender);
    const silentMismatch =
      normalizeGender(narratorGender) !== 'UNKNOWN' &&
      payload.genderUsed !== 'UNKNOWN' &&
      normalizeGender(narratorGender) !== payload.genderUsed &&
      payload.voiceMismatch !== true;

    expect(silentMismatch).toBe(false);
    expect(payload.voiceMismatch).toBe(true);
  });
});
