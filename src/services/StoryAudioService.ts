import { prismaService } from '../database/prisma/prisma.service';
import { VoiceProfileResult, EmotionMapResult } from '../types';
import { ITTSProvider, TTSResult } from './tts/ITTSProvider';
import { EmotionEngineTTSProvider, mapNarratorToVoiceRole } from './tts/EmotionEngineTTSProvider';
import { ElevenLabsTTSProvider } from './tts/ElevenLabsTTSProvider';
import { DefaultTTSProvider } from './tts/DefaultTTSProvider';
import { EmotionEngineClient } from './EmotionEngineClient';
import { AudioValidationService } from './AudioValidationService';
import { LanguageValidationService } from './LanguageValidationService';
import { getLanguageConfig } from '../config/language.config';

export interface StoryAudioRecord {
  id: string;
  storyScriptId: string;
  provider: string;
  voiceId: string;
  voiceName: string;
  language: string;
  audioUrl: string;
  storagePath?: string;
  duration: number; // actual duration in seconds
  format: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
  emotionAware?: boolean;
  /** Gender of the synthesized voice actually used (MALE/FEMALE/UNKNOWN). */
  genderUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

function useLegacyTTS(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (process.env.USE_LEGACY_ELEVENLABS || '').toLowerCase()
  );
}

export class StoryAudioService {
  private emotionEngineProvider: EmotionEngineTTSProvider = new EmotionEngineTTSProvider();
  private legacyElevenLabsProvider: ElevenLabsTTSProvider = new ElevenLabsTTSProvider();
  private legacyDefaultProvider: DefaultTTSProvider = new DefaultTTSProvider();
  private inMemoryAudio: Map<string, StoryAudioRecord> = new Map();

  async generateNarrationAudio(
    storyScriptId: string,
    scriptText: string,
    narrator?: VoiceProfileResult | null,
    emotionMap?: EmotionMapResult | null,
    language = 'en',
    characterMap?: Record<string, string>
  ): Promise<StoryAudioRecord> {
    const cleanText = scriptText.trim();
    if (!cleanText) {
      throw new Error('AUDIO_GENERATION_FAILED: Script text cannot be empty');
    }

    const langConfig = getLanguageConfig(language);
    const cacheKey = `${storyScriptId}:${langConfig.code}`;

    if (langConfig.code !== 'en') {
      const val = LanguageValidationService.validateTextLanguage(cleanText, langConfig.code);
      if (!val.isValid) {
        console.warn(`[StoryAudioService] Script text language validation warning for '${langConfig.code}': ${val.reason}`);
      }
    }

    if (this.inMemoryAudio.has(cacheKey)) {
      const cached = this.inMemoryAudio.get(cacheKey)!;
      const validation = AudioValidationService.validateAudioRecord(cached.audioUrl, cached.storagePath, cached.duration);
      if (validation.isValid) {
        console.log(`[StoryAudioService] Audio cache hit for '${storyScriptId}' in '${langConfig.name}' (${cached.provider}).`);
        return cached;
      }
      this.inMemoryAudio.delete(cacheKey);
    }

    const narratorRole = mapNarratorToVoiceRole(narrator);
    const voiceGender = narrator?.genderPresentation || 'FEMALE';

    let finalTTSResult: TTSResult;

    if (useLegacyTTS()) {
      finalTTSResult = await this.synthesizeLegacy(
        storyScriptId,
        cleanText,
        narrator,
        emotionMap,
        langConfig.code,
        langConfig.locale,
        voiceGender
      );
    } else {
      finalTTSResult = await this.synthesizeEmotionEngine(
        storyScriptId,
        cleanText,
        emotionMap,
        langConfig.code,
        langConfig.locale,
        narratorRole,
        voiceGender,
        characterMap
      );
    }

    const validation = AudioValidationService.validateAudioRecord(
      finalTTSResult.audioUrl,
      finalTTSResult.storagePath,
      finalTTSResult.duration
    );

    if (!validation.isValid) {
      throw new Error(`TTS_AUDIO_INVALID: Generated audio failed validation (${validation.reason})`);
    }

    const record: StoryAudioRecord = {
      id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      storyScriptId,
      provider: finalTTSResult.provider,
      voiceId: finalTTSResult.voiceId,
      voiceName: finalTTSResult.voiceName,
      language: langConfig.name,
      audioUrl: finalTTSResult.audioUrl,
      storagePath: finalTTSResult.storagePath,
      duration: finalTTSResult.duration,
      format: finalTTSResult.format,
      status: 'READY',
      emotionAware: finalTTSResult.emotionAware || false,
      genderUsed: finalTTSResult.genderUsed,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.inMemoryAudio.set(cacheKey, record);
    this.inMemoryAudio.set(storyScriptId, record);

    if (prismaService.isAvailable) {
      try {
        const parentScriptExists = await prismaService.storytellingScript.findUnique({
          where: { id: storyScriptId },
        });

        let targetScriptId = storyScriptId;
        if (!parentScriptExists) {
          let contentSource = await prismaService.contentSource.findFirst();
          if (!contentSource) {
            contentSource = await prismaService.contentSource.create({
              data: {
                title: 'Default Story Source',
                normalizedTitle: `default-${Date.now()}`,
                contentType: 'FOLKLORE',
              },
            });
          }

          const fallbackScript = await prismaService.storytellingScript.create({
            data: {
              id: storyScriptId,
              contentSourceId: contentSource.id,
              mode: 'STANDARD',
              script: scriptText,
              model: 'claude-3-5-sonnet',
              provider: 'claude',
            },
          });
          targetScriptId = fallbackScript.id;
        }

        await prismaService.storyAudio.create({
          data: {
            id: record.id,
            storyScriptId: targetScriptId,
            provider: record.provider,
            voiceId: record.voiceId,
            voiceName: record.voiceName,
            language: record.language,
            audioUrl: record.audioUrl,
            duration: record.duration,
            format: record.format,
            status: record.status,
          },
        });
      } catch (err: any) {
        console.warn('[TTS] PostgreSQL database persistence warning:', err.message);
      }
    }

    console.log(
      `[TTS] Final provider: ${record.provider} | voice: ${record.voiceName} | genderUsed: ${record.genderUsed} | duration: ${record.duration}s`
    );
    return record;
  }

  private async synthesizeEmotionEngine(
    storyScriptId: string,
    cleanText: string,
    emotionMap: EmotionMapResult | null | undefined,
    language: string,
    locale: string,
    narratorRole: string,
    voiceGender: string,
    characterMap?: Record<string, string>
  ): Promise<TTSResult> {
    const engineRecentlyVerified = emotionMap?.analysisSource === 'emotion-engine';
    if (!engineRecentlyVerified) {
      const health = await EmotionEngineClient.checkHealth();
      if (!health.ok) {
        const hint =
          health.reason === 'timeout'
            ? ' The server may be busy synthesizing another story — retry in a few minutes or increase EMOTION_ENGINE_HEALTH_TIMEOUT_MS.'
            : health.reason === 'connection_refused'
              ? ' Start the Emotion Engine at EMOTION_ENGINE_URL and ensure GET /health responds.'
              : ' Legacy fallback is disabled unless USE_LEGACY_ELEVENLABS=true.';
        throw new Error(`TTS_GENERATION_FAILED: Emotion Engine health check failed (${health.detail}).${hint}`);
      }
    } else {
      console.log(
        '[TTS] Skipping redundant Emotion Engine health check — tagging succeeded via Emotion Engine on this story.'
      );
    }

    console.log(
      `[TTS] Using Emotion Engine Piper synthesis for '${storyScriptId}' (${language}, role=${narratorRole})...`
    );

    const emotionSegments =
      emotionMap && emotionMap.segments.length > 0
        ? EmotionEngineTTSProvider.buildSegmentsFromEmotionMap(emotionMap, narratorRole)
        : undefined;

    try {
      return await this.emotionEngineProvider.synthesize({
        text: cleanText,
        gender: voiceGender,
        language,
        locale,
        narratorRole,
        jobId: `${storyScriptId}-${language}`,
        emotionSegments,
        characterMap,
      });
    } catch (err: any) {
      const message = err?.message || String(err);
      if (message.includes('timed out')) {
        throw new Error(
          `TTS_GENERATION_FAILED: Emotion Engine /narrate timed out — ${message}. For long stories, raise EMOTION_ENGINE_NARRATE_TIMEOUT_MS or EMOTION_ENGINE_NARRATE_TIMEOUT_MAX_MS.`
        );
      }
      if (message.includes('connection refused')) {
        throw new Error(
          `TTS_GENERATION_FAILED: Emotion Engine is not running — ${message}`
        );
      }
      throw new Error(`TTS_GENERATION_FAILED: Emotion Engine /narrate failed — ${message}`);
    }
  }

  /** Manual-only legacy path (USE_LEGACY_ELEVENLABS=true). No automatic fallback. */
  private async synthesizeLegacy(
    storyScriptId: string,
    cleanText: string,
    narrator: VoiceProfileResult | null | undefined,
    emotionMap: EmotionMapResult | null | undefined,
    language: string,
    locale: string,
    voiceGender: string
  ): Promise<TTSResult> {
    console.warn('[TTS] USE_LEGACY_ELEVENLABS=true — using deprecated ElevenLabs/Default providers.');

    if (await this.legacyElevenLabsProvider.isAvailable()) {
      try {
        if (emotionMap && emotionMap.segments.length > 0) {
          const segmentResults: TTSResult[] = [];
          for (const seg of emotionMap.segments) {
            segmentResults.push(
              await this.legacyElevenLabsProvider.synthesize({
                text: seg.text,
                gender: voiceGender,
                language,
                locale,
                emotion: { type: seg.emotion, intensity: seg.intensity },
              })
            );
          }
          return segmentResults[0];
        }
        return await this.legacyElevenLabsProvider.synthesize({
          text: cleanText,
          gender: voiceGender,
          language,
          locale,
        });
      } catch (err: any) {
        throw new Error(`TTS_GENERATION_FAILED: Legacy ElevenLabs failed — ${err.message}`);
      }
    }

    return this.legacyDefaultProvider.synthesize({
      text: cleanText,
      gender: voiceGender,
      language,
      locale,
    });
  }

  async getAudioByScriptId(storyScriptId: string, language = 'en'): Promise<StoryAudioRecord | null> {
    const langConfig = getLanguageConfig(language);
    const cacheKey = `${storyScriptId}:${langConfig.code}`;
    const cached = this.inMemoryAudio.get(cacheKey) || this.inMemoryAudio.get(storyScriptId);
    if (cached) {
      const validation = AudioValidationService.validateAudioRecord(cached.audioUrl, cached.storagePath, cached.duration);
      if (validation.isValid) return cached;
    }

    if (prismaService.isAvailable) {
      try {
        const dbRecord = await prismaService.storyAudio.findFirst({
          where: { storyScriptId },
        });
        if (dbRecord) {
          const rec: StoryAudioRecord = {
            id: dbRecord.id,
            storyScriptId: dbRecord.storyScriptId,
            provider: dbRecord.provider,
            voiceId: dbRecord.voiceId,
            voiceName: dbRecord.voiceName,
            language: dbRecord.language,
            audioUrl: dbRecord.audioUrl,
            duration: dbRecord.duration,
            format: dbRecord.format,
            status: dbRecord.status as any,
            createdAt: dbRecord.createdAt,
            updatedAt: dbRecord.updatedAt,
          };
          const val = AudioValidationService.validateAudioRecord(rec.audioUrl, rec.storagePath, rec.duration);
          if (val.isValid) return rec;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }
}

export const storyAudioService = new StoryAudioService();
