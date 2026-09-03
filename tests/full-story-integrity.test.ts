import { AIProviderManager } from '../src/ai/AIProviderManager';
import { ResearchService } from '../src/services/ResearchService';
import { ScriptService } from '../src/services/ScriptService';
import { RightsService } from '../src/services/RightsService';
import { TranslationService } from '../src/services/TranslationService';
import { LanguageValidationService } from '../src/services/LanguageValidationService';

describe('Phase 1 — Full Story Integrity, Translation Fidelity & Duplicate Content Prevention', () => {
  let aiManager: AIProviderManager;
  let researchService: ResearchService;
  let rightsService: RightsService;
  let scriptService: ScriptService;
  let translationService: TranslationService;

  beforeAll(() => {
    aiManager = new AIProviderManager();
    researchService = new ResearchService();
    rightsService = new RightsService();
    scriptService = new ScriptService(aiManager, rightsService);
    translationService = new TranslationService(aiManager);
  });

  test('1. English Jungle Book: Complete narrative without duplicate ending paragraph loops', async () => {
    const research = await researchService.performResearch('The Jungle Book', 'BOOK');
    const scriptObj = await scriptService.generateScript('The Jungle Book', 'BOOK', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    const scriptText = scriptObj.script;

    expect(scriptText).toContain('Mowgli');
    expect(scriptText).toContain('Baloo');
    expect(scriptText).toContain('Bagheera');
    expect(scriptText).toContain('Shere Khan');

    // Check for duplicated paragraph loops
    const paragraphs = scriptText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const uniqueParagraphs = new Set(paragraphs.map(p => p.trim()));
    
    // There should be NO repeated identical paragraphs!
    expect(uniqueParagraphs.size).toBe(paragraphs.length);
    console.log(`[Jungle Book English] Paragraph count: ${paragraphs.length} (All unique!)`);
  });

  test('2. Hindi Jungle Book: Translates complete story, preserving all paragraphs and zero short templates', async () => {
    const research = await researchService.performResearch('The Jungle Book', 'BOOK');
    const scriptObj = await scriptService.generateScript('The Jungle Book', 'BOOK', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    const englishText = scriptObj.script;

    const translation = await translationService.translateStory('jungle-book-hi', englishText, 'hi', 'en');
    const hindiText = translation.translatedText;

    expect(hindiText).not.toContain('यह एक महान कहानी का हिंदी रूपांतरण है');
    expect(hindiText).toContain('मोगली');
    expect(hindiText).toContain('बघीरा');
    expect(hindiText).toContain('शेर खान');

    const englishParagraphs = englishText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const hindiParagraphs = hindiText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    expect(hindiParagraphs.length).toBe(englishParagraphs.length);
    console.log(`[Jungle Book Hindi] English paragraphs: ${englishParagraphs.length} | Hindi paragraphs: ${hindiParagraphs.length}`);

    const val = LanguageValidationService.validateTextLanguage(hindiText, 'hi');
    expect(val.isValid).toBe(true);
  });

  test('3. Spanish 3 Idiots: Translates complete story with full fidelity and zero generic templates', async () => {
    const research = await researchService.performResearch('3 Idiots', 'MOVIE');
    const scriptObj = await scriptService.generateScript('3 Idiots', 'MOVIE', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    const englishText = scriptObj.script;

    const translation = await translationService.translateStory('3-idiots-es', englishText, 'es', 'en');
    const spanishText = translation.translatedText;

    expect(spanishText).not.toContain('Esta es la narración completa de la historia en español');
    expect(spanishText).toContain('Rancho');
    expect(spanishText).toContain('Farhan');
    expect(spanishText).toContain('Raju');

    const val = LanguageValidationService.validateTextLanguage(spanishText, 'es');
    expect(val.isValid).toBe(true);
  });
});
