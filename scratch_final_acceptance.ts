import { runFullPipelineController, translateContentController } from './src/modules/content/content.controller';
import { SUPPORTED_LANGUAGES } from './src/config/language.config';
import { emotionAnalysisService } from './src/services/EmotionAnalysisService';
import { storyAudioService } from './src/services/StoryAudioService';

async function runAcceptanceSuite() {
  console.log('====================================================');
  console.log('   PHASE 1 FINAL ACCEPTANCE VERIFICATION SUITE      ');
  console.log('====================================================\n');

  const executePipeline = async (input: string, language = 'en') => {
    let resData: any;
    const req = { body: { input, language } } as any;
    const res = { status: () => ({ json: (d: any) => { resData = d; } }) } as any;
    await runFullPipelineController(req, res);
    return resData;
  };

  const executeTranslate = async (scriptId: string, language: string) => {
    let resData: any;
    const req = { body: { scriptId, language } } as any;
    const res = { status: () => ({ json: (d: any) => { resData = d; } }) } as any;
    await translateContentController(req, res);
    return resData;
  };

  // 1. Cinderella Initial Execution
  console.log('--- 1. CINDERELLA ENGLISH PIPELINE ---');
  const cinEng = await executePipeline('Cinderella', 'en');
  console.log(`Status: ${cinEng.status}`);
  console.log(`Title: ${cinEng.content.title}`);
  console.log(`Type: ${cinEng.content.type}`);
  console.log(`Word Count: ${cinEng.story.wordCount}`);
  console.log(`Full Script Length: ${cinEng.story.fullScript?.length} chars`);
  console.log(`Narrator: ${cinEng.narrator.voiceName} (${cinEng.narrator.gender})`);
  console.log(`Audio URL: ${cinEng.audio.url}`);
  console.log(`Audio Duration: ${cinEng.audio.duration}s`);
  console.log(`Emotion Segment Count: ${cinEng.emotionMap?.segments?.length}`);

  // 2. Multilingual Translations for Cinderella (Hindi & Spanish)
  console.log('\n--- 2. CINDERELLA MULTILINGUAL TRANSLATION (NO RE-RESEARCH) ---');
  const scriptId = cinEng.content.id;

  const cinHi = await executeTranslate(scriptId, 'hi');
  console.log(`[Hindi] Status: ${cinHi.status}, Word Count: ${cinHi.story.wordCount}, Audio Duration: ${cinHi.audio.duration}s`);
  console.log(`[Hindi] Sample Text: ${cinHi.story.fullScript?.substring(0, 120)}...`);

  const cinEs = await executeTranslate(scriptId, 'es');
  console.log(`[Spanish] Status: ${cinEs.status}, Word Count: ${cinEs.story.wordCount}, Audio Duration: ${cinEs.audio.duration}s`);
  console.log(`[Spanish] Sample Text: ${cinEs.story.fullScript?.substring(0, 120)}...`);

  // 3. Translation Cache Verification (Second Hindi Request)
  console.log('\n--- 3. TRANSLATION & AUDIO CACHE VERIFICATION ---');
  const t0 = Date.now();
  const cinHiCached = await executeTranslate(scriptId, 'hi');
  const elapsed = Date.now() - t0;
  console.log(`[Hindi Cache Request] Elapsed: ${elapsed}ms, Status: ${cinHiCached.status}, Audio URL: ${cinHiCached.audio.url}`);

  // 4. Tested Languages Verification Matrix
  console.log('\n--- 4. MULTILINGUAL LANGUAGES MATRIX VERIFICATION ---');
  const targetLangs = ['en', 'hi', 'es', 'fr', 'de', 'zh', 'ja', 'ar'];
  for (const langCode of targetLangs) {
    const tr = await executeTranslate(scriptId, langCode);
    console.log(`[${langCode.toUpperCase()}] Status: ${tr.status}, Lang: ${tr.audio.language}, URL: ${tr.audio.url ? 'PASS' : 'FAIL'}`);
  }

  // 5. Narrative Tests: Titanic, Jungle Book, Free-form
  console.log('\n--- 5. REGRESSION & CATEGORY PIPELINE TESTS ---');

  const titanicRes = await executePipeline('Titanic', 'en');
  console.log(`[Titanic] Status: ${titanicRes.status}, Type: ${titanicRes.content.type}, Words: ${titanicRes.story.wordCount}, Narrator: ${titanicRes.narrator.voiceName}`);

  const jungleRes = await executePipeline('The Jungle Book', 'en');
  console.log(`[Jungle Book] Status: ${jungleRes.status}, Type: ${jungleRes.content.type}, Words: ${jungleRes.story.wordCount}, Narrator: ${jungleRes.narrator.voiceName}`);

  const freeformRes = await executePipeline('A story about a brave little girl', 'en');
  console.log(`[Freeform] Status: ${freeformRes.status}, Type: ${freeformRes.content.type}, Words: ${freeformRes.story.wordCount}, Narrator: ${freeformRes.narrator.voiceName}`);

  // 6. Emotion Map Verification
  console.log('\n--- 6. EMOTION ARC VERIFICATION ---');
  const emSegs = cinEng.emotionMap?.segments || [];
  emSegs.slice(0, 6).forEach((s: any) => {
    console.log(`Seg ${s.segmentIndex}: Emotion=${s.emotion}, Intensity=${s.intensity}, Pace=${s.pace}, Pitch=${s.pitch}, TextLen=${s.text.length}`);
  });

  console.log('\n====================================================');
  console.log('   VERIFICATION SUITE RUN COMPLETED SUCCESSFULLY     ');
  console.log('====================================================');
}

runAcceptanceSuite().catch(console.error);
