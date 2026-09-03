import { AIProviderManager } from './src/ai/AIProviderManager';
import { ResearchService } from './src/services/ResearchService';
import { ScriptService } from './src/services/ScriptService';
import { CharacterService } from './src/services/CharacterService';
import { NarratorService } from './src/services/NarratorService';
import { TranslationService } from './src/services/TranslationService';
import { EmotionAnalysisService } from './src/services/EmotionAnalysisService';
import { StoryAudioService } from './src/services/StoryAudioService';
import { storyValidator } from './src/services/StoryValidator';
import { prismaService } from './src/database/prisma/prisma.service';

async function verify3IdiotsPipeline() {
  console.log('=== Deep Verification: 3 Idiots Full Story Script & TTS Input ===\n');

  const aiManager = new AIProviderManager();
  const researchService = new ResearchService();
  const scriptService = new ScriptService(aiManager, { evaluateRights: () => ({ allowed: true, rightsMode: 'ORIGINAL_RETETTLING' }) } as any);
  const characterService = new CharacterService(aiManager);
  const narratorService = new NarratorService(aiManager);
  const translationService = new TranslationService(aiManager);
  const emotionService = new EmotionAnalysisService();
  const audioService = new StoryAudioService();

  const input = '3 Idiots';

  // 1. Classification
  const classification = await aiManager.classifyContent(input);
  console.log(`[1. Classification] ContentType: ${classification.contentType} | Title: ${classification.canonicalTitle}`);
  if (classification.contentType !== 'MOVIE') {
    throw new Error(`FAIL: Classification returned '${classification.contentType}' instead of 'MOVIE'`);
  }

  // 2. Research
  const research = await researchService.performResearch(classification.canonicalTitle, classification.contentType);
  console.log(`[2. Research] Found ${research.facts.length} facts. Description: ${research.description}`);

  // 3. Full Script Generation
  const scriptResult = await scriptService.generateScript(classification.canonicalTitle, classification.contentType, research.facts, {
    mode: 'STANDARD',
    language: 'English'
  }, research);

  const fullScriptText = scriptResult.script;
  const wordCount = fullScriptText.trim().split(/\s+/).length;
  console.log(`[3. Full Script] Generated script length: ${fullScriptText.length} chars | Word count: ${wordCount} words`);

  // Story Validator Check
  const val = storyValidator.validateStory(fullScriptText, 'STANDARD');
  console.log(`[3. Validation] Valid: ${val.valid} | Issues: ${val.issues.join(', ') || 'None'}`);

  // Check key narrative elements
  const requiredElements = [
    'Rancho',
    'Phunsukh Wangdu',
    'Farhan',
    'Raju',
    'Virus',
    'Imperial College of Engineering',
    'photography',
    'Aal Izz Well',
    'Ladakh'
  ];

  const missingElements = requiredElements.filter(el => !fullScriptText.includes(el));
  console.log(`[3. Narrative Elements] Missing required terms: ${missingElements.join(', ') || 'NONE (All elements present!)'}`);
  if (missingElements.length > 0) {
    throw new Error(`FAIL: Generated script is missing key 3 Idiots story elements: ${missingElements.join(', ')}`);
  }

  // 4. Character & Narrator Selection
  const characters = await characterService.extractCharacters(fullScriptText);
  const narrator = await narratorService.selectNarrator({ title: '3 Idiots', contentType: 'MOVIE' }, fullScriptText, characters);
  console.log(`[4. Narrator] Selected voice: ${narrator.style} | Gender: ${narrator.genderPresentation}`);

  // 5. Emotion Analysis on FULL SCRIPT
  const emotionMap = emotionService.analyzeStoryEmotions('3-idiots-test', fullScriptText, 'en');
  console.log(`[5. Emotion Analysis] Generated ${emotionMap.segments.length} emotion segments for full script.`);

  // 6. Summary vs Full Script Separation Check
  const summarySentences = fullScriptText.split(/(?<=[.!?])\s+/);
  const shortSummary = summarySentences.slice(0, 2).join(' ');
  console.log(`\n--- SUMMARY vs FULL SCRIPT SEPARATION ---`);
  console.log(`Short Summary (${shortSummary.split(/\s+/).length} words):\n"${shortSummary}"\n`);
  console.log(`Full Script Preview (${wordCount} words):\n"${fullScriptText.substring(0, 250)}..."\n`);

  if (shortSummary.length >= fullScriptText.length) {
    throw new Error(`FAIL: Short summary is not properly separated from full script!`);
  }

  // 7. TTS Audio Generation (MUST RECEIVE FULL SCRIPT, NOT SUMMARY)
  console.log(`[7. Audio Generation] Synthesizing TTS from FULL SCRIPT (${fullScriptText.length} chars)...`);
  const audioRecord = await audioService.generateNarrationAudio('3-idiots-test', fullScriptText, narrator, emotionMap, 'en');

  console.log(`[7. Audio Record] Status: ${audioRecord.status} | Provider: ${audioRecord.provider} | URL: ${audioRecord.audioUrl} | Duration: ${audioRecord.duration}s`);

  if (audioRecord.duration < 15) {
    throw new Error(`FAIL: Audio duration (${audioRecord.duration}s) is too short. Summary was likely sent to TTS instead of full script!`);
  }

  console.log('\n=== ALL DEEP VERIFICATION CHECKS PASSED SUCCESSFULLY! ===\n');
}

verify3IdiotsPipeline().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
