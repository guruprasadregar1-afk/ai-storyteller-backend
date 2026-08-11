import { PromptLabService } from '../src/services/PromptLabService';

describe('Sprint 14 Backend Test Suite — Prompt Engineering Lab & Visual Bible Fine-Tuning (BE-099 to BE-104)', () => {
  let promptLabService: PromptLabService;

  beforeEach(() => {
    promptLabService = new PromptLabService();
  });

  test('BE-099: Retrieve curated prompt template gallery', () => {
    const templates = promptLabService.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(2);

    const names = templates.map(t => t.name);
    expect(names).toContain('Character Visual Bible');
    expect(names).toContain('Cinematic Environment');
  });

  test('BE-100: Save custom prompt template with token estimation', () => {
    const custom = promptLabService.saveTemplate({
      name: 'Cyberpunk Vehicle Concept',
      category: 'Vehicle',
      templateText: 'Futuristic flying car over neon cyberpunk city, metallic reflection',
      negativePrompt: 'vintage car, wheels, ground'
    , tokenEstimate: 0 });

    expect(custom.id).toBeDefined();
    expect(custom.tokenEstimate).toBeGreaterThan(0);
  });

  test('BE-101 & BE-102: Optimize raw prompt and generate 3 artistic variations', () => {
    const raw = 'Hero standing on a mountain peak at dusk';
    const result = promptLabService.optimizePrompt(raw, 'Cinematic');

    expect(result.originalPrompt).toBe(raw);
    expect(result.optimizedPrompt).toContain('8k resolution');
    expect(result.negativePrompt).toContain('blurry');
    expect(result.variations.length).toBe(3);
  });

  test('BE-103: Accurately estimate token count for prompt text', () => {
    const tokens = promptLabService.estimateTokens('A warrior with a glowing sword standing in dark forest');
    expect(tokens).toBeGreaterThan(5);
  });

  test('BE-104: Return default token estimation for short prompts', () => {
    const tokens = promptLabService.estimateTokens('Dragon');
    expect(tokens).toBeGreaterThanOrEqual(1);
  });
});
