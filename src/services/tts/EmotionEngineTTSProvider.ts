import { VoiceProfileResult, EmotionMapResult, StoryEmotion, TTSProviderCapabilities } from '../../types';
import { ITTSProvider, TTSOptions, TTSResult } from './ITTSProvider';
import { EmotionEngineClient } from '../EmotionEngineClient';
import { getEmotionEngineConfig } from '../../config/emotion.config';

const STORY_TO_ENGINE_EMOTION: Record<string, string> = {
  JOYFUL: 'joy',
  HOPEFUL: 'joy',
  SAD: 'sadness',
  MELANCHOLIC: 'sadness',
  FEARFUL: 'fear',
  SUSPENSEFUL: 'fear',
  ANGRY: 'anger',
  URGENT: 'anger',
  AWE: 'surprise',
  SURPRISED: 'surprise',
  CALM: 'neutral',
  NEUTRAL: 'neutral',
  SERIOUS: 'neutral',
  REFLECTIVE: 'neutral',
  TRIUMPHANT: 'joy',
};

export function mapNarratorToVoiceRole(narrator?: VoiceProfileResult | null): string {
  if (!narrator) return 'adult_female';
  const age = (narrator.ageGroup || 'ADULT').toUpperCase();
  const gender = (narrator.genderPresentation || 'FEMALE').toUpperCase();
  const isMale = gender === 'MALE' || gender === 'MAN' || gender === 'BOY';
  const isFemale = gender === 'FEMALE' || gender === 'WOMAN' || gender === 'GIRL';

  if (age.includes('CHILD') || age.includes('TEEN')) {
    if (isMale) return 'child_male';
    if (isFemale) return 'child_female';
    return 'child_female';
  }
  if (age.includes('ELDER') || age.includes('OLD')) {
    if (isMale) return 'elderly_male';
    if (isFemale) return 'elderly_female';
    return 'elderly_female';
  }
  if (isMale) return 'adult_male';
  if (isFemale) return 'adult_female';
  return 'adult_female';
}

export function mapStoryEmotionToEngineEmotion(emotion: StoryEmotion | string): string {
  return STORY_TO_ENGINE_EMOTION[String(emotion).toUpperCase()] || 'neutral';
}

export class EmotionEngineTTSProvider implements ITTSProvider {
  name = 'emotion-engine';

  async isAvailable(): Promise<boolean> {
    const config = getEmotionEngineConfig();
    return config.enabled && (await EmotionEngineClient.isAvailable());
  }

  getCapabilities(): TTSProviderCapabilities {
    return {
      languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'bn', 'mr', 'te', 'ta', 'ur'],
      voices: [
        'adult_male',
        'adult_female',
        'child_male',
        'child_female',
        'elderly_male',
        'elderly_female',
      ],
      supportsEmotion: true,
      supportsProsody: true,
      supportsPitch: true,
      supportsRate: true,
      supportsVolume: false,
      supportsSSML: false,
    };
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const language = options.language || 'en';
    const narratorRole = options.narratorRole || mapNarratorToVoiceRole(
      options.gender
        ? ({
            genderPresentation: options.gender,
            ageGroup: 'ADULT',
          } as VoiceProfileResult)
        : null
    );

    const segments =
      options.emotionSegments && options.emotionSegments.length > 0
        ? options.emotionSegments.map((seg) => ({
            speaker: seg.speaker || 'narrator',
            text: seg.text,
            emotion: seg.emotion,
            intensity: seg.intensity,
            role: seg.role || narratorRole,
          }))
        : [
            {
              speaker: 'narrator',
              text: options.text,
              emotion: options.emotion?.type
                ? mapStoryEmotionToEngineEmotion(options.emotion.type)
                : 'neutral',
              intensity: options.emotion?.intensity ?? 0.3,
              role: narratorRole,
            },
          ];

    const response = await EmotionEngineClient.narrate({
      segments,
      language,
      narrator_role: narratorRole,
      job_id: options.jobId,
      character_map: options.characterMap,
    });

    const speakers = [...new Set(segments.map((s) => s.speaker))];
    const roles = [...new Set(segments.map((s) => s.role))];
    console.log(
      `[EmotionEngineTTSProvider] POST /narrate: ${segments.length} segments, ` +
        `speakers=[${speakers.join(', ')}], roles=[${roles.join(', ')}]`
    );
    segments.slice(0, 12).forEach((seg, idx) => {
      console.log(
        `  [narrate ${idx + 1}] speaker=${seg.speaker} role=${seg.role} | ${seg.text.substring(0, 60)}`
      );
    });
    if (segments.length > 8) {
      console.log(`  ... and ${segments.length - 8} more segments`);
    }

    if (response.voice_gaps?.length) {
      console.warn('[EmotionEngineTTSProvider] Voice gaps reported:', response.voice_gaps);
    }

    return {
      provider: response.provider,
      voiceId: response.voice_id,
      voiceName: response.voice_name,
      language: response.voice_name,
      locale: options.locale,
      audioUrl: response.audio_url,
      duration: response.duration,
      format: response.format,
      storagePath: response.storage_path,
      status: 'READY',
      emotionAware: response.emotion_aware,
      genderUsed: response.gender_used,
    };
  }

  /** Build narrate segments from a Storyteller emotion map (preserves per-speaker roles). */
  static buildSegmentsFromEmotionMap(
    emotionMap: EmotionMapResult,
    narratorRole: string
  ): Array<{ speaker: string; text: string; emotion: string; intensity: number; role: string }> {
    return emotionMap.segments.map((seg) => {
      const speaker = seg.speaker || 'narrator';
      return {
        speaker,
        text: seg.text,
        emotion: mapStoryEmotionToEngineEmotion(seg.emotion),
        intensity: seg.intensity,
        role: seg.role ?? (speaker === 'narrator' ? narratorRole : 'adult_male'),
      };
    });
  }
}
