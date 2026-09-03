import { AIProviderManager } from '../src/ai/AIProviderManager';
import { ResearchService } from '../src/services/ResearchService';
import { ScriptService } from '../src/services/ScriptService';
import { RightsService } from '../src/services/RightsService';
import {
  isGenericResearchFallback,
  validateStoryGrounding,
} from '../src/common/utils/story-grounding.util';

describe('literary work grounding', () => {
  let aiManager: AIProviderManager;
  let researchService: ResearchService;
  let scriptService: ScriptService;

  beforeAll(() => {
    aiManager = new AIProviderManager();
    researchService = new ResearchService(aiManager);
    scriptService = new ScriptService(aiManager, new RightsService());
  });

  test('classifies The Tell-Tale Heart as STORY, not USER_CONTEXT', async () => {
    const classification = await aiManager.classifyContent('The Tell-Tale Heart');
    expect(classification.contentType).toBe('STORY');
    expect(classification.contentType).not.toBe('USER_CONTEXT');
  });

  test('structured research hit for The Tell-Tale Heart with Poe plot facts', async () => {
    const research = await researchService.performResearch('The Tell-Tale Heart', 'STORY');
    expect(research.grounded).toBe(true);
    expect(isGenericResearchFallback(research)).toBe(false);
    expect(research.facts.join(' ').toLowerCase()).toMatch(/vulture eye|floorboard|heartbeat|edgar allan poe/);
    expect(research.characters?.some(c => /old man/i.test(c.name))).toBe(true);
  });

  test('generates a Poe-connected Tell-Tale Heart script, not unrelated fantasy', async () => {
    const research = await researchService.performResearch('The Tell-Tale Heart', 'STORY');
    const result = await scriptService.generateScript(
      'The Tell-Tale Heart',
      'STORY',
      research.facts,
      { mode: 'STANDARD', language: 'English', requireMultiVoiceDialogue: false },
      research
    );

    const scriptLower = result.script.toLowerCase();
    expect(scriptLower).not.toContain('caelum');
    expect(scriptLower).not.toContain('lyrin');
    expect(scriptLower).toMatch(/old man|vulture|floorboard|heartbeat|confess/);
    expect(validateStoryGrounding(result.script, research).valid).toBe(true);
  });

  test('structured research hit for The Gift of the Magi', async () => {
    const classification = await aiManager.classifyContent('The Gift of the Magi');
    expect(classification.contentType).toBe('STORY');

    const research = await researchService.performResearch('The Gift of the Magi', 'STORY');
    expect(research.grounded).toBe(true);
    expect(research.facts.join(' ').toLowerCase()).toMatch(/della|jim|hair|watch|magi/);
  });

  test('rejects ungrounded generic research instead of silently proceeding', () => {
    const genericResearch = {
      title: 'Unknown Title',
      canonicalTitle: 'Unknown Title',
      contentType: 'USER_CONTEXT' as const,
      adaptationVersion: 'TRADITIONAL' as const,
      description: 'Original story research compiled for Unknown Title.',
      setting: 'A vivid world of adventure and heart.',
      themes: ['Courage'],
      characters: [{ name: 'Lead Character', role: 'Protagonist' }],
      facts: [
        'Unknown Title centers around a compelling protagonist embarking on a journey of discovery and perseverance.',
      ],
      references: [],
      grounded: false,
    };

    expect(isGenericResearchFallback(genericResearch)).toBe(true);
    expect(
      validateStoryGrounding(
        'Caelum sealed the magic cavern with a crystal to save the village of Lyrin.',
        genericResearch
      ).valid
    ).toBe(false);
  });

  test('unknown title without KB throws RESEARCH_GROUNDING_FAILED when AI unavailable', async () => {
    const offlineResearch = new ResearchService();
    await expect(offlineResearch.performResearch('Totally Obscure Unknown Title XYZ123')).rejects.toThrow(
      'RESEARCH_GROUNDING_FAILED'
    );
  });
});
