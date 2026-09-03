import { TranslationService } from '../src/services/TranslationService';
import { EmotionAnalysisService } from '../src/services/EmotionAnalysisService';
import { StoryAudioService } from '../src/services/StoryAudioService';
import { EmotionEngineClient } from '../src/services/EmotionEngineClient';
import { LanguageValidationService } from '../src/services/LanguageValidationService';
import { AIProviderManager } from '../src/ai/AIProviderManager';

describe('Phase 1 — Multilingual Language Consistency & Mixed-Language Regression Test Suite', () => {
  let aiManager: AIProviderManager;
  let translationService: TranslationService;
  let emotionService: EmotionAnalysisService;
  let audioService: StoryAudioService;

  const englishCanonicalStory = `In a prosperous kingdom, there once lived a young maiden named Cinderella.

Tragedy struck the household when Cinderella's beloved mother fell ill and died in heartbreak and tears.

One crisp morning, brass trumpets declared a grand masquerade ball at the Royal Palace.

With a flick of her magical wand, the Fairy Godmother stepped out in luminous silver light.

Just as they turned beneath the crystal chandelier, the clock struck midnight in sudden panic and running footsteps.

The glass slipper fitted her foot perfectly in great triumph and peace.`;

  beforeAll(() => {
    aiManager = new AIProviderManager();
    translationService = new TranslationService(aiManager);
    emotionService = new EmotionAnalysisService();
    audioService = new StoryAudioService();
    process.env.USE_LEGACY_ELEVENLABS = 'false';
    process.env.EMOTION_ENGINE_ENABLED = 'true';
  });

  async function requireEngine(): Promise<boolean> {
    return EmotionEngineClient.isAvailable();
  }

  test('1. English: Cinderella language = en receives English narration only', async () => {
    const translation = await translationService.translateStory('cinderella-en', englishCanonicalStory, 'en', 'en');
    expect(translation.targetLanguage).toBe('en');
    expect(translation.translatedText).toBe(englishCanonicalStory);

    const val = LanguageValidationService.validateTextLanguage(translation.translatedText, 'en');
    expect(val.isValid).toBe(true);

    if (!(await requireEngine())) return;
    const audio = await audioService.generateNarrationAudio('cinderella-en', translation.translatedText, null, null, 'en');
    expect(audio.status).toBe('READY');
    expect(audio.provider).toBe('emotion-engine');
    expect(audio.audioUrl).toContain('/audio/');
  }, 120_000);

  test('2. Spanish: Cinderella language = es starts and remains entirely in Spanish', async () => {
    const translation = await translationService.translateStory('cinderella-es', englishCanonicalStory, 'es', 'en');
    expect(translation.targetLanguage).toBe('es');
    expect(translation.translatedText).not.toContain('Once upon a time');
    expect(translation.translatedText).not.toContain('In a prosperous kingdom');

    const val = LanguageValidationService.validateTextLanguage(translation.translatedText, 'es');
    expect(val.isValid).toBe(true);

    const canonicalEmotion = await emotionService.analyzeStoryEmotions('cinderella-es', englishCanonicalStory, 'en');
    const spanishEmotion = emotionService.preserveEmotionAcrossTranslation(canonicalEmotion, translation.translatedText, 'es', englishCanonicalStory);

    expect(spanishEmotion.segments.length).toBeGreaterThan(0);
    spanishEmotion.segments.forEach((seg, idx) => {
      const segVal = LanguageValidationService.validateTextLanguage(seg.text, 'es');
      expect(segVal.isValid).toBe(true);
      console.log(`[Test Spanish Seg ${idx + 1}] preview: "${seg.text.substring(0, 30)}..."`);
    });

    if (!(await requireEngine())) return;
    const audio = await audioService.generateNarrationAudio(`cinderella-es-${Date.now()}`, translation.translatedText, null, spanishEmotion, 'es');
    expect(audio.status).toBe('READY');
    expect(audio.provider).toBe('emotion-engine');
  }, 120_000);

  test('3. Hindi: Cinderella language = hi starts and remains entirely in Hindi', async () => {
    const translation = await translationService.translateStory('cinderella-hi', englishCanonicalStory, 'hi', 'en');
    expect(translation.targetLanguage).toBe('hi');
    expect(translation.translatedText).not.toContain('Once upon a time');

    const val = LanguageValidationService.validateTextLanguage(translation.translatedText, 'hi');
    expect(val.isValid).toBe(true);

    const canonicalEmotion = await emotionService.analyzeStoryEmotions('cinderella-hi', englishCanonicalStory, 'en');
    const hindiEmotion = emotionService.preserveEmotionAcrossTranslation(canonicalEmotion, translation.translatedText, 'hi', englishCanonicalStory);

    hindiEmotion.segments.forEach((seg) => {
      const segVal = LanguageValidationService.validateTextLanguage(seg.text, 'hi');
      expect(segVal.isValid).toBe(true);
    });

    if (!(await requireEngine())) return;
    const audio = await audioService.generateNarrationAudio(`cinderella-hi-${Date.now()}`, translation.translatedText, { genderPresentation: 'MALE', ageGroup: 'ADULT' } as any, hindiEmotion, 'hi');
    expect(audio.status).toBe('READY');
    expect(audio.provider).toBe('emotion-engine');
    expect(audio.genderUsed).toBe('MALE');
  }, 120_000);

  test('4. French: Cinderella language = fr starts and remains entirely in French', async () => {
    const translation = await translationService.translateStory('cinderella-fr', englishCanonicalStory, 'fr', 'en');
    expect(translation.targetLanguage).toBe('fr');
    expect(translation.translatedText).not.toContain('In a prosperous kingdom');

    const val = LanguageValidationService.validateTextLanguage(translation.translatedText, 'fr');
    expect(val.isValid).toBe(true);

    const canonicalEmotion = await emotionService.analyzeStoryEmotions('cinderella-fr', englishCanonicalStory, 'en');
    const frenchEmotion = emotionService.preserveEmotionAcrossTranslation(canonicalEmotion, translation.translatedText, 'fr', englishCanonicalStory);

    frenchEmotion.segments.forEach((seg) => {
      const segVal = LanguageValidationService.validateTextLanguage(seg.text, 'fr');
      expect(segVal.isValid).toBe(true);
    });

    if (!(await requireEngine())) return;
    const audio = await audioService.generateNarrationAudio(`cinderella-fr-${Date.now()}`, translation.translatedText, null, frenchEmotion, 'fr');
    expect(audio.status).toBe('READY');
    expect(audio.provider).toBe('emotion-engine');
  }, 120_000);

  test('5. German: Cinderella language = de starts and remains entirely in German', async () => {
    const translation = await translationService.translateStory('cinderella-de', englishCanonicalStory, 'de', 'en');
    expect(translation.targetLanguage).toBe('de');

    const val = LanguageValidationService.validateTextLanguage(translation.translatedText, 'de');
    expect(val.isValid).toBe(true);

    const canonicalEmotion = await emotionService.analyzeStoryEmotions('cinderella-de', englishCanonicalStory, 'en');
    const germanEmotion = emotionService.preserveEmotionAcrossTranslation(canonicalEmotion, translation.translatedText, 'de', englishCanonicalStory);

    germanEmotion.segments.forEach((seg) => {
      const segVal = LanguageValidationService.validateTextLanguage(seg.text, 'de');
      expect(segVal.isValid).toBe(true);
    });

    if (!(await requireEngine())) return;
    const audio = await audioService.generateNarrationAudio(`cinderella-de-${Date.now()}`, translation.translatedText, null, germanEmotion, 'de');
    expect(audio.status).toBe('READY');
    expect(audio.provider).toBe('emotion-engine');
  }, 120_000);

  test('6. Mixed-Language Regression Test: Fails if narration text mixes English introduction with Spanish script', () => {
    const mixedScript = `In a prosperous kingdom, there once lived a young maiden named Cinderella.
Había una vez en un próspero reino una joven doncella.`;

    const val = LanguageValidationService.validateTextLanguage(mixedScript, 'es');
    expect(val.isValid).toBe(false);
    expect(val.reason).toContain('untranslated English narrative phrases');
  });
});
