/**
 * End-to-end multi-voice verification: 3 Idiots fixture → analyze → narrate.
 * Requires Emotion Engine at EMOTION_ENGINE_URL with Piper voices installed.
 */
import fs from 'fs';
import { EmotionAnalysisService } from './src/services/EmotionAnalysisService';
import { EmotionEngineTTSProvider, mapNarratorToVoiceRole } from './src/services/tts/EmotionEngineTTSProvider';
import { EmotionEngineClient } from './src/services/EmotionEngineClient';

const FIXTURE = 'D:\\python\\Emotion_Engine\\tests\\fixtures\\original_story.txt';

const CHARACTER_MAP: Record<string, string> = {
  Rancho: 'adult_male',
  Virus: 'adult_male',
  Farhan: 'adult_male',
  Raju: 'adult_male',
  Pia: 'adult_female',
  Chatur: 'adult_male',
  narrator: 'adult_female',
};

async function main() {
  process.env.EMOTION_ENGINE_ENABLED = 'true';
  process.env.USE_LEGACY_ELEVENLABS = 'false';

  if (!(await EmotionEngineClient.isAvailable())) {
    throw new Error('Emotion Engine not reachable — start server at EMOTION_ENGINE_URL');
  }

  const story = fs.readFileSync(FIXTURE, 'utf-8');
  const emotionService = new EmotionAnalysisService();

  console.log('=== Multi-voice E2E: 3 Idiots ===\n');
  console.log(`Story length: ${story.length} chars\n`);

  const emotionMap = await emotionService.analyzeStoryEmotions('3idiots-multivoice', story, 'en', {
    characterMap: CHARACTER_MAP,
  });

  const speakers = [...new Set(emotionMap.segments.map((s) => s.speaker || 'narrator'))];
  const roles = [...new Set(emotionMap.segments.map((s) => s.role).filter(Boolean))];
  console.log(`Emotion map: ${emotionMap.segments.length} segments`);
  console.log(`Speakers: ${speakers.join(', ')}`);
  console.log(`Roles: ${roles.join(', ')}\n`);

  const narrator = { genderPresentation: 'FEMALE', ageGroup: 'ADULT' } as any;
  const narratorRole = mapNarratorToVoiceRole(narrator);
  const narrateSegments = EmotionEngineTTSProvider.buildSegmentsFromEmotionMap(emotionMap, narratorRole);

  console.log('--- Segments sent to /narrate ---');
  const narrateSpeakers = [...new Set(narrateSegments.map((s) => s.speaker))];
  const narrateRoles = [...new Set(narrateSegments.map((s) => s.role))];
  console.log(`Count: ${narrateSegments.length}`);
  console.log(`Speakers: ${narrateSpeakers.join(', ')}`);
  console.log(`Roles: ${narrateRoles.join(', ')}\n`);

  narrateSegments.forEach((seg, idx) => {
    if (seg.speaker !== 'narrator' || idx < 5) {
      console.log(
        `[${idx + 1}] speaker=${seg.speaker} role=${seg.role} | ${seg.text.substring(0, 70)}`
      );
    }
  });

  const allNarrator =
    narrateSegments.every((s) => s.speaker === 'narrator') &&
    narrateSegments.every((s) => s.role === narratorRole);
  if (allNarrator) {
    throw new Error('FAIL: All /narrate segments are narrator — multi-voice not wired');
  }
  if (narrateSpeakers.length < 3) {
    throw new Error(`FAIL: Expected 3+ speakers in /narrate payload, got ${narrateSpeakers.join(', ')}`);
  }
  if (narrateRoles.length < 2) {
    throw new Error(`FAIL: Expected 2+ roles in /narrate payload, got ${narrateRoles.join(', ')}`);
  }

  console.log('\n--- Generating audio via EmotionEngineTTSProvider ---');
  const provider = new EmotionEngineTTSProvider();
  const start = Date.now();
  const audio = await provider.synthesize({
    text: story,
    language: 'en',
    narratorRole,
    jobId: `3idiots-multivoice-${Date.now()}`,
    characterMap: CHARACTER_MAP,
    emotionSegments: narrateSegments,
  });
  const elapsed = Date.now() - start;

  console.log(`\nAudio: ${audio.audioUrl}`);
  console.log(`Provider: ${audio.provider}`);
  console.log(`Duration: ${audio.duration}s`);
  console.log(`Elapsed: ${elapsed}ms`);
  console.log('\nCheck Emotion Engine server logs for NARRATE segment lines with distinct voice_id values.');
  console.log('=== MULTI-VOICE E2E PASSED ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
