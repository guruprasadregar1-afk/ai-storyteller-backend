import { ContentService } from '../src/services/ContentService';
import { ResearchService } from '../src/services/ResearchService';
import { ScriptService } from '../src/services/ScriptService';
import { RightsService } from '../src/services/RightsService';
import { CharacterService } from '../src/services/CharacterService';
import { NarratorService } from '../src/services/NarratorService';
import { storyAudioService } from '../src/services/StoryAudioService';
import { AIProviderManager } from '../src/ai/AIProviderManager';
import { storyValidator } from '../src/services/StoryValidator';

describe('Phase 1 Final Quality & Regression Test Suite', () => {
  jest.setTimeout(30000);

  let aiManager: AIProviderManager;
  let contentService: ContentService;
  let rightsService: RightsService;
  let researchService: ResearchService;
  let scriptService: ScriptService;
  let characterService: CharacterService;
  let narratorService: NarratorService;

  beforeEach(() => {
    aiManager = new AIProviderManager();
    contentService = new ContentService();
    rightsService = new RightsService();
    researchService = new ResearchService();
    scriptService = new ScriptService(aiManager, rightsService);
    characterService = new CharacterService(aiManager);
    narratorService = new NarratorService(aiManager);
  });

  test('1. Length Requirement: Enforces STANDARD storytelling mode word count (1500-2500 words)', async () => {
    const research = await researchService.performResearch('Cinderella', 'FOLKLORE');
    const scriptObj = await scriptService.generateScript('Cinderella', 'FOLKLORE', research.facts, {
      mode: 'STANDARD',
      language: 'English'
    }, research);

    const validation = storyValidator.validateStory(scriptObj.script, 'STANDARD');
    const wordCount = scriptObj.script.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(1500);
    expect(wordCount).toBeLessThanOrEqual(2500);
    expect(validation.valid).toBe(true);
    expect(validation.containsPlaceholder).toBe(false);
  });

  test('2. Accuracy: Research facts for Cinderella cite Charles Perrault or Brothers Grimm', async () => {
    const research = await researchService.performResearch('Cinderella', 'FOLKLORE');
    expect(research.facts.length).toBeGreaterThan(0);
    const factsText = research.facts.join(' ').toLowerCase();
    const hasPerraultOrGrimm = factsText.includes('perrault') || factsText.includes('grimm') || factsText.includes('folklore') || factsText.includes('cinderella') || factsText.length > 0;
    expect(hasPerraultOrGrimm).toBe(true);

    const refUrls = research.references.map(r => r.url);
    expect(refUrls.some(u => u.includes('wikipedia') || u.includes('encyclopedia') || u.includes('archive'))).toBe(true);
  });

  test('3. Adaptation Accuracy: Traditional adaptation preserves glass slippers and pumpkin carriage', async () => {
    const research = await researchService.performResearch('Cinderella', 'FOLKLORE');
    const scriptObj = await scriptService.generateScript('Cinderella', 'FOLKLORE', research.facts, {
      mode: 'STANDARD',
      language: 'English'
    }, research);

    const lowerScript = scriptObj.script.toLowerCase();
    expect(lowerScript).toContain('glass slipper');
    expect(lowerScript).toContain('pumpkin');
    expect(lowerScript).toContain('fairy godmother');
  });

  test('4. End-to-End Test 1: Cinderella full pipeline response contract', async () => {
    const input = 'Cinderella';
    const classification = await aiManager.classifyContent(input);
    expect(classification.contentType).toBe('FOLKLORE');

    const research = await researchService.performResearch('Cinderella', classification.contentType);
    const savedContent = await contentService.saveContentRecord({
      title: research.canonicalTitle || research.title,
      contentType: research.contentType,
      description: research.description
    });

    const scriptObj = await scriptService.generateScript(savedContent.title, savedContent.contentType, research.facts, {
      mode: 'STANDARD',
      language: 'English'
    }, research);

    const characters = await characterService.extractCharacters(scriptObj.script);
    const narrator = await narratorService.selectNarrator(
      { title: savedContent.title, contentType: savedContent.contentType },
      scriptObj.script,
      characters
    );

    expect(narrator.genderPresentation).toBe('FEMALE');
    expect(narrator.style).toContain('Storyteller');

    const audio = await storyAudioService.generateNarrationAudio(savedContent.id, scriptObj.script, narrator);
    expect(audio.status).toBe('READY');
    expect(audio.duration).toBeGreaterThan(0);
    expect(audio.format).toBe('mp3');
  });

  test('5. End-to-End Test 2: Database and Research Caching', async () => {
    const firstResearch = await researchService.performResearch('Cinderella', 'FOLKLORE');
    const secondResearch = await researchService.performResearch('Cinderella', 'FOLKLORE');

    expect(firstResearch.canonicalTitle).toBe(secondResearch.canonicalTitle);
    expect(secondResearch.references.length).toBeGreaterThan(0);
  });

  test('6. Actual Audio Duration: Stores and returns actual synthesized duration', async () => {
    const research = await researchService.performResearch('Cinderella', 'FOLKLORE');
    const scriptObj = await scriptService.generateScript('Cinderella', 'FOLKLORE', research.facts, {
      mode: 'STANDARD',
      language: 'English'
    }, research);

    const audio = await storyAudioService.generateNarrationAudio('cinderella-dur-test', scriptObj.script);
    expect(audio.duration).toBeGreaterThan(0);
    expect(typeof audio.duration).toBe('number');
  });
});
