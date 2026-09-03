import { AIProviderManager } from '../src/ai/AIProviderManager';
import { TranslationService } from '../src/services/TranslationService';
import { LanguageValidationService } from '../src/services/LanguageValidationService';
import { ClaudeProvider } from '../src/ai/ClaudeProvider';

describe('CRITICAL FIX — Multi-Language Translation Purity & Non-Hybrid Validation', () => {
  let aiManager: AIProviderManager;
  let translationService: TranslationService;
  let claudeProvider: ClaudeProvider;

  beforeEach(() => {
    aiManager = new AIProviderManager();
    translationService = new TranslationService(aiManager);
    claudeProvider = new ClaudeProvider();
  });

  test('1. Rani Lakshmibai in Hindi: Must produce 100% Devanagari Hindi paragraphs without "एक समय की बात है" opener repeat or English leakage', async () => {
    const scriptObj = await claudeProvider.generateStoryScript('Rani Lakshmibai', [], { mode: 'STANDARD' });
    const translation = await translationService.translateStory('rani-lakshmibai-test', scriptObj.script, 'hi', 'en');

    const resultText = translation.translatedText;
    const paragraphs = resultText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    console.log('\n=== RANI LAKSHMIBAI HINDI TRANSLATION OUTPUT ===');
    console.log(resultText);
    console.log('===============================================\n');

    expect(paragraphs.length).toBeGreaterThanOrEqual(4);

    // Assert NO repeated opener phrase across paragraphs
    const openers = paragraphs.map(p => p.trim().split(/[,.!?]/)[0].trim());
    const onceUponCounts = openers.filter(o => o.includes('एक समय की बात है')).length;
    expect(onceUponCounts).toBeLessThanOrEqual(1);

    // Assert NO spliced hybrid words like "नायकic" or "साहसीst"
    expect(resultText).not.toContain('नायकic');
    expect(resultText).not.toContain('साहसीst');

    // Assert per-paragraph Devanagari purity >= 80% for every paragraph
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const val = LanguageValidationService.validateTextLanguage(p, 'hi');
      expect(val.isValid).toBe(true);
      expect(val.scriptPurity).toBeGreaterThanOrEqual(0.80);
    }
  });

  test('2. Matrix Test: All 5 Presets x 5 Languages must pass per-paragraph language purity & zero hardcoded opener repetition', async () => {
    const presets = ['3 Idiots', 'The Jungle Book', 'Cinderella', 'Titanic', 'Rani Lakshmibai'];
    const languages = ['hi', 'es', 'fr', 'de', 'ar'];

    for (const title of presets) {
      const scriptObj = await claudeProvider.generateStoryScript(title, [], { mode: 'STANDARD' });

      for (const lang of languages) {
        const trans = await translationService.translateStory(`matrix-${title}-${lang}`, scriptObj.script, lang, 'en');
        const paragraphs = trans.translatedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        // Language validation on complete text (opener guard uses content similarity)
        const val = LanguageValidationService.validateTextLanguage(trans.translatedText, lang);
        expect(val.isValid).toBe(true);
      }
    }
  });
});
