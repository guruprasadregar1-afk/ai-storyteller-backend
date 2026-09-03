/**
 * Re-test Tell-Tale Heart TTS through StoryAudioService (Node client timeouts).
 * Requires Emotion Engine running with Piper voices.
 *
 * Usage: npx ts-node scripts/retest_tell_tale_tts.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { StoryAudioService } from '../src/services/StoryAudioService';
import { EmotionAnalysisService } from '../src/services/EmotionAnalysisService';
import { mapNarratorToVoiceRole } from '../src/services/tts/EmotionEngineTTSProvider';

async function main() {
  const providerPath = path.join(__dirname, '../src/ai/ClaudeProvider.ts');
  const src = fs.readFileSync(providerPath, 'utf-8');
  const match = src.match(
    /lowerTitle\.includes\('tell-tale heart'\)[\s\S]*?fullScript = `([\s\S]*?)`;\s+\} else \{/
  );
  const story = match?.[1];
  if (!story) {
    throw new Error('Could not extract Tell-Tale Heart script from ClaudeProvider.ts');
  }

  console.log(`Story: ${story.length} chars`);
  process.env.EMOTION_ENGINE_ENABLED = 'true';
  process.env.USE_LEGACY_ELEVENLABS = 'false';

  const emotionService = new EmotionAnalysisService();
  const audioService = new StoryAudioService();
  const narratorRole = mapNarratorToVoiceRole({
    genderPresentation: 'MALE',
    ageGroup: 'ADULT',
  } as any);

  const tagStart = Date.now();
  const emotionMap = await emotionService.analyzeStoryEmotions(
    `retest-tell-tale-${Date.now()}`,
    story,
    'en',
    { characterMap: { narrator: narratorRole } }
  );
  console.log(
    `Tag complete in ${((Date.now() - tagStart) / 1000).toFixed(1)}s — ` +
      `${emotionMap.segments.length} segments, source=${emotionMap.analysisSource}`
  );

  const narrateStart = Date.now();
  const audio = await audioService.generateNarrationAudio(
    `retest-tell-tale-${Date.now()}`,
    story,
    { genderPresentation: 'MALE', ageGroup: 'ADULT' } as any,
    emotionMap,
    'en',
    { narrator: narratorRole }
  );
  const narrateSec = (Date.now() - narrateStart) / 1000;
  console.log(
    `Narrate complete in ${narrateSec.toFixed(1)}s — provider=${audio.provider}, ` +
      `duration=${audio.duration}s, url=${audio.audioUrl}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
