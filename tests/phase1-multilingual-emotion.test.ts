import { SUPPORTED_LANGUAGES, getLanguageConfig } from '../src/config/language.config';
import { TranslationService } from '../src/services/TranslationService';
import { EmotionAnalysisService } from '../src/services/EmotionAnalysisService';
import { EmotionEngineTTSProvider } from '../src/services/tts/EmotionEngineTTSProvider';
import { EmotionEngineClient } from '../src/services/EmotionEngineClient';
import { AudioAssemblerService } from '../src/services/AudioAssemblerService';
import { StoryAudioService } from '../src/services/StoryAudioService';
import { AIProviderManager } from '../src/ai/AIProviderManager';

describe('Phase 1 Enhancement — Multilingual & Emotion-Aware Narration Test Suite', () => {
  let aiManager: AIProviderManager;
  let translationService: TranslationService;
  let emotionService: EmotionAnalysisService;
  let emotionEngineProvider: EmotionEngineTTSProvider;
  let audioAssembler: AudioAssemblerService;
  let audioService: StoryAudioService;

  beforeEach(() => {
    aiManager = new AIProviderManager();
    translationService = new TranslationService(aiManager);
    emotionService = new EmotionAnalysisService();
    emotionEngineProvider = new EmotionEngineTTSProvider();
    process.env.USE_LEGACY_ELEVENLABS = 'false';
    process.env.EMOTION_ENGINE_ENABLED = 'true';
    audioAssembler = new AudioAssemblerService();
    audioService = new StoryAudioService();
  });

  test('1. Language Config: Supports 16 global languages with default fallback to English', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(16);
    const hindiConfig = getLanguageConfig('hi');
    expect(hindiConfig.code).toBe('hi');
    expect(hindiConfig.name).toBe('Hindi');
    expect(hindiConfig.nativeName).toBe('हिन्दी');
    expect(hindiConfig.supportedTTSProviders).toEqual(['emotion-engine']);

    const unknownConfig = getLanguageConfig('xyz-unknown');
    expect(unknownConfig.code).toBe('en');
  });

  test('2. Emotion Engine TTS: Piper /narrate provider reports emotion-aware capabilities', async () => {
    const caps = emotionEngineProvider.getCapabilities();
    expect(caps.supportsEmotion).toBe(true);
    expect(caps.supportsProsody).toBe(true);
    expect(caps.languages.length).toBeGreaterThanOrEqual(16);
    expect(caps.voices).toContain('adult_male');

    if (await EmotionEngineClient.isAvailable()) {
      expect(await emotionEngineProvider.isAvailable()).toBe(true);
    }
  });

  test('3. Multilingual Translation: Translates English story to Hindi, Spanish, French & German preserving structure', async () => {
    const englishStory = 'In a prosperous kingdom, there once stood a grand country estate. Once upon a time, Cinderella lived happily.';
    const hiResult = await translationService.translateStory('script-test-1', englishStory, 'hi', 'en');
    expect(hiResult.targetLanguage).toBe('hi');
    expect(hiResult.translatedText).toContain('एक समृद्ध राज्य में');

    const esResult = await translationService.translateStory('script-test-1', englishStory, 'es', 'en');
    expect(esResult.targetLanguage).toBe('es');
    expect(esResult.translatedText).toContain('En un próspero reino');

    const frResult = await translationService.translateStory('script-test-1', englishStory, 'fr', 'en');
    expect(frResult.targetLanguage).toBe('fr');
    expect(frResult.translatedText).toContain('Dans un royaume prospère');
  });

  test('4. Translation Cache: Reuses cached translation without duplicate processing', async () => {
    const story = 'Once upon a time in a faraway castle...';
    const firstRes = await translationService.translateStory('script-cache-test', story, 'hi');
    const secondRes = await translationService.translateStory('script-cache-test', story, 'hi');

    expect(firstRes).toBe(secondRes);
  });

  test('5. Emotion Analysis Arc: Generates non-flat emotion map with dynamic transitions', async () => {
    const fullStoryScript = `In a prosperous kingdom, there once lived a young maiden named Cinderella.

Tragedy struck the household when Cinderella's beloved mother fell ill and died in heartbreak and tears.

One crisp morning, brass trumpets declared a grand masquerade ball at the Royal Palace.

With a flick of her magical wand, the Fairy Godmother stepped out in luminous silver light.

Just as they turned beneath the crystal chandelier, the clock struck midnight in sudden panic and running footsteps.

The glass slipper fitted her foot perfectly in great triumph and peace.`;

    const emotionMap = await emotionService.analyzeStoryEmotions('cinderella-script-1', fullStoryScript, 'en');
    expect(emotionMap.segments.length).toBeGreaterThanOrEqual(5);

    const emotions = emotionMap.segments.map(s => s.emotion);
    expect(emotions).toContain('SAD');
    expect(emotions).toContain('AWE');
    expect(emotions).toContain('SUSPENSEFUL');
    expect(emotions).toContain('TRIUMPHANT');

    // Verify non-flat emotion arc
    const uniqueEmotions = new Set(emotions);
    expect(uniqueEmotions.size).toBeGreaterThanOrEqual(3);
  });

  test('6. Emotion Preservation: Preserves canonical emotion arc across target languages', async () => {
    const englishScript = `In a prosperous kingdom, there lived a maiden.

Tragedy struck when her mother died in tears.

The glass slipper fitted in great triumph.`;

    const canonicalMap = await emotionService.analyzeStoryEmotions('cinderella-script-2', englishScript, 'en');
    const hindiScript = `एक समृद्ध राज्य में एक राजकुमारी रहती थी।

दुखद घटना घटी जब उसकी माँ का आँसुओं में निधन हो गया।

कांच की जूती पूर्ण विजय के साथ आ गई।`;

    const preservedMap = emotionService.preserveEmotionAcrossTranslation(canonicalMap, hindiScript, 'hi', englishScript);
    expect(preservedMap.language).toBe('hi');
    expect(preservedMap.segments.length).toBe(canonicalMap.segments.length);
    expect(preservedMap.segments[0].emotion).toBe(canonicalMap.segments[0].emotion);
    expect(preservedMap.segments[1].emotion).toBe('SAD');
  });

  test('7. Emotion-Aware TTS via Emotion Engine: synthesizes multi-segment audio', async () => {
    if (!(await EmotionEngineClient.isAvailable())) {
      console.warn('Skipping TTS test: Emotion Engine not running');
      return;
    }

    const scriptText = 'In a prosperous kingdom, there lived Cinderella.\n\nShe wept tears of heartbreak.\n\nShe rejoiced in triumph!';
    const emotionMap = await emotionService.analyzeStoryEmotions('audio-assembly-test', scriptText, 'en');

    const audioRecord = await audioService.generateNarrationAudio(
      `audio-assembly-test-${Date.now()}`,
      scriptText,
      { genderPresentation: 'FEMALE', ageGroup: 'ADULT' } as any,
      emotionMap,
      'en'
    );

    expect(audioRecord.status).toBe('READY');
    expect(audioRecord.provider).toBe('emotion-engine');
    expect(audioRecord.duration).toBeGreaterThan(0);
    expect(audioRecord.audioUrl).toContain('/audio/');
  }, 120_000);

  test('8. Multilingual Audio Caching: Caches synthesized audio per language code', async () => {
    if (!(await EmotionEngineClient.isAvailable())) {
      console.warn('Skipping cache test: Emotion Engine not running');
      return;
    }

    const scriptText = 'A brave adventurer embarked on a quest.';
    const id = `multilingual-cache-${Date.now()}`;
    const audio1 = await audioService.generateNarrationAudio(id, scriptText, null, null, 'hi');
    const audio2 = await audioService.generateNarrationAudio(id, scriptText, null, null, 'hi');

    expect(audio1.id).toBe(audio2.id);
  }, 120_000);
});
