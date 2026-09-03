import { StoryAudioRecord } from '../../services/StoryAudioService';

export interface PublicAudioResponse {
  url: string;
  duration: number;
  format: string;
  language: string;
  provider: string;
  voiceId: string;
  voiceName: string;
  genderUsed: string;
  emotionAware?: boolean;
  voiceMismatch?: boolean;
}

const FEMALE_VOICE_HINTS = ['female', 'amy', 'bella', 'rachel', 'kristin', 'kathleen', 'priya', 'swara'];
const MALE_VOICE_HINTS = ['male', 'ryan', 'antoni', 'adam', 'rohan', 'pratham', 'lessac'];

export function inferGenderFromVoice(voiceId: string, voiceName: string): string {
  const haystack = `${voiceId} ${voiceName}`.toLowerCase();
  const femaleScore = FEMALE_VOICE_HINTS.filter((hint) => haystack.includes(hint)).length;
  const maleScore = MALE_VOICE_HINTS.filter((hint) => haystack.includes(hint)).length;

  if (femaleScore > maleScore) return 'FEMALE';
  if (maleScore > femaleScore) return 'MALE';
  return 'UNKNOWN';
}

export function normalizeGender(value?: string | null): string {
  if (!value) return 'UNKNOWN';
  const upper = value.toUpperCase();
  if (upper.includes('FEMALE') || upper.includes('WOMAN') || upper.includes('GIRL')) return 'FEMALE';
  if (upper.includes('MALE') || upper.includes('MAN') || upper.includes('BOY')) return 'MALE';
  return upper;
}

export function buildPublicAudioResponse(
  audio: StoryAudioRecord,
  languageName: string,
  narratorGender?: string | null
): PublicAudioResponse {
  const genderUsed = audio.genderUsed || inferGenderFromVoice(audio.voiceId, audio.voiceName);
  const normalizedNarratorGender = normalizeGender(narratorGender);
  const voiceMismatch =
    normalizedNarratorGender !== 'UNKNOWN' &&
    genderUsed !== 'UNKNOWN' &&
    normalizedNarratorGender !== genderUsed;

  return {
    url: audio.audioUrl,
    duration: audio.duration,
    format: audio.format,
    language: languageName,
    provider: audio.provider,
    voiceId: audio.voiceId,
    voiceName: audio.voiceName,
    genderUsed,
    emotionAware: audio.emotionAware,
    voiceMismatch,
  };
}
