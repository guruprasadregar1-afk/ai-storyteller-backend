import { AIProviderManager } from '../src/ai/AIProviderManager';
import { CharacterService } from '../src/services/CharacterService';

describe('Sprint 3 Backend Test Suite — Character Consistency & Visual Bible (BE-026 to BE-032)', () => {
  let aiManager: AIProviderManager;
  let characterService: CharacterService;

  beforeEach(() => {
    aiManager = new AIProviderManager();
    characterService = new CharacterService(aiManager);
  });

  test('BE-026: Generate character visual turnaround sheet prompt with seed', async () => {
    const visual = await characterService.generateVisualBible('char-001');

    expect(visual.characterId).toBe('char-001');
    expect(visual.seed).toBeGreaterThan(0);
    expect(visual.turnaroundPrompt).toContain('Character turnaround sheet');
  });

  test('BE-027: High consistency score calculated for visual prompt generation', async () => {
    const visual = await characterService.generateVisualBible('char-002');
    expect(visual.consistencyScore).toBeGreaterThanOrEqual(0.9);
  });

  test('BE-028: Store and retrieve face embedding representation', async () => {
    const visual = await characterService.generateVisualBible('char-003');
    expect(visual.faceEmbedding).toBeDefined();
    expect(JSON.parse(visual.faceEmbedding!)).toBeInstanceOf(Array);
  });

  test('BE-029: Retrieve stored character visual bible', async () => {
    await characterService.generateVisualBible('char-004');
    const bible = await characterService.getVisualBible('char-004');

    expect(bible.characterId).toBe('char-004');
    expect(bible.turnaroundPrompt).toBeDefined();
  });

  test('BE-030 & BE-031: Lock character seed and update clothing style & avatar URL', async () => {
    const updated = await characterService.updateAvatarAndSeed(
      'char-005',
      999444,
      'https://example.com/hero-avatar.jpg',
      'Cyberpunk Stealth Suit'
    );

    expect(updated.seed).toBe(999444);
    expect(updated.avatarUrl).toBe('https://example.com/hero-avatar.jpg');
    expect(updated.clothingStyle).toBe('Cyberpunk Stealth Suit');
    expect(updated.turnaroundPrompt).toContain('Locked seed 999444');
  });

  test('BE-032: Ensure character visual state persists across fetches', async () => {
    await characterService.updateAvatarAndSeed('char-006', 123456, 'https://example.com/avatar6.jpg');
    const fetched = await characterService.getVisualBible('char-006');

    expect(fetched.seed).toBe(123456);
    expect(fetched.avatarUrl).toBe('https://example.com/avatar6.jpg');
  });
});
