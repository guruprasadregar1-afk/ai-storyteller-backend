import { AIProviderManager } from '../src/ai/AIProviderManager';
import { ResearchService } from '../src/services/ResearchService';
import { ScriptService } from '../src/services/ScriptService';
import { RightsService } from '../src/services/RightsService';
import { CharacterService } from '../src/services/CharacterService';
import { NarratorService } from '../src/services/NarratorService';
import { ContentService } from '../src/services/ContentService';

describe('Phase 1 — Preset Story Generation & Script Authenticity Test Suite', () => {
  let aiManager: AIProviderManager;
  let researchService: ResearchService;
  let rightsService: RightsService;
  let scriptService: ScriptService;
  let characterService: CharacterService;
  let narratorService: NarratorService;
  let contentService: ContentService;

  beforeAll(() => {
    aiManager = new AIProviderManager();
    researchService = new ResearchService();
    rightsService = new RightsService();
    scriptService = new ScriptService(aiManager, rightsService);
    characterService = new CharacterService(aiManager);
    narratorService = new NarratorService(aiManager);
    contentService = new ContentService();
  });

  test('1. Preset 3 Idiots: Correct MOVIE classification, authentic characters, and script', async () => {
    const classification = await aiManager.classifyContent('3 Idiots');
    expect(classification.contentType).toBe('MOVIE');
    expect(classification.canonicalTitle).toBe('3 Idiots');

    const research = await researchService.performResearch('3 Idiots', classification.contentType);
    expect(research.contentType).toBe('MOVIE');
    expect(research.facts.some(f => f.toLowerCase().includes('rancho') || f.toLowerCase().includes('farhan'))).toBe(true);

    const scriptObj = await scriptService.generateScript('3 Idiots', 'MOVIE', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    expect(scriptObj.script).toContain('Imperial College of Engineering');
    expect(scriptObj.narrationPath).toBe('multi-voice');
    expect(scriptObj.script).toContain('Rancho');
    expect(scriptObj.script).toContain('Farhan');
    expect(scriptObj.script).toContain('Phunsukh Wangdu');
    expect(scriptObj.script).not.toContain('ancient oak groves');

    const characters = await characterService.extractCharacters(scriptObj.script);
    expect(characters.some(c => c.name.includes('Rancho'))).toBe(true);
    expect(characters.some(c => c.name.includes('Farhan'))).toBe(true);

    const narrator = await narratorService.selectNarrator({ title: '3 Idiots', contentType: 'MOVIE' }, scriptObj.script, characters);
    expect(narrator.genderPresentation).toBe('MALE');
    expect(narrator.style).toContain('Cinematic');
  });

  test('2. Preset Rani Lakshmibai: Correct HISTORY classification, authentic characters, and script', async () => {
    const classification = await aiManager.classifyContent('Rani Lakshmibai');
    expect(classification.contentType).toBe('HISTORY');

    const research = await researchService.performResearch('Rani Lakshmibai', 'HISTORY');
    expect(research.facts.some(f => f.toLowerCase().includes('jhansi'))).toBe(true);

    const scriptObj = await scriptService.generateScript('Rani Lakshmibai', 'HISTORY', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    expect(scriptObj.script).toContain('Jhansi');
    expect(scriptObj.narrationPath).toBe('narrator-only');
    expect(scriptObj.script).toContain('Damodar Rao');
    expect(scriptObj.script).toContain('Main apni Jhansi nahi doongi');
    expect(scriptObj.script).not.toContain('ancient oak groves');

    const characters = await characterService.extractCharacters(scriptObj.script);
    expect(characters.some(c => c.name.includes('Rani Lakshmibai'))).toBe(true);

    const narrator = await narratorService.selectNarrator({ title: 'Rani Lakshmibai', contentType: 'HISTORY' }, scriptObj.script, characters);
    expect(narrator.genderPresentation).toBe('FEMALE');
  });

  test('3. Preset Titanic: Correct MOVIE classification and Jack & Rose story', async () => {
    const classification = await aiManager.classifyContent('Titanic');
    expect(classification.contentType).toBe('MOVIE');

    const research = await researchService.performResearch('Titanic', 'MOVIE');
    const scriptObj = await scriptService.generateScript('Titanic', 'MOVIE', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    expect(scriptObj.script).toContain('Rose DeWitt Bukater');
    expect(scriptObj.script).toContain('Jack Dawson');
    expect(scriptObj.script).toContain('RMS Titanic');
  });

  test('4. Preset The Jungle Book: Correct BOOK classification and Mowgli story', async () => {
    const classification = await aiManager.classifyContent('The Jungle Book');
    expect(classification.contentType).toBe('BOOK');

    const research = await researchService.performResearch('The Jungle Book', 'BOOK');
    const scriptObj = await scriptService.generateScript('The Jungle Book', 'BOOK', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    expect(scriptObj.script).toContain('Mowgli');
    expect(scriptObj.narrationPath).toBe('multi-voice');
    expect(scriptObj.script).toContain('Baloo');
    expect(scriptObj.script).toContain('Bagheera');
    expect(scriptObj.script).toContain('Shere Khan');
  });

  test('5. Preset Cinderella: Correct FOLKLORE classification and fairytale story', async () => {
    const classification = await aiManager.classifyContent('Cinderella');
    expect(classification.contentType).toBe('FOLKLORE');

    const research = await researchService.performResearch('Cinderella', 'FOLKLORE');
    const scriptObj = await scriptService.generateScript('Cinderella', 'FOLKLORE', research.facts, { mode: 'STANDARD', language: 'English' }, research);
    expect(scriptObj.script).toContain('Cinderella');
    expect(scriptObj.script).toContain('Fairy Godmother');
    expect(scriptObj.script).toContain('Lady Tremaine');
  });
});
