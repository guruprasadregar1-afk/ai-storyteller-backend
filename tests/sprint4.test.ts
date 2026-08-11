import { StyleService } from '../src/services/StyleService';

describe('Sprint 4 Backend Test Suite — Environment & Style Presets (BE-033 to BE-038)', () => {
  let styleService: StyleService;

  beforeEach(() => {
    styleService = new StyleService();
  });

  test('BE-033: Retrieve curated style preset gallery', () => {
    const presets = styleService.getStylePresets();
    expect(presets.length).toBeGreaterThanOrEqual(6);

    const names = presets.map(p => p.name);
    expect(names).toContain('Cinematic 3D');
    expect(names).toContain('Anime');
    expect(names).toContain('Cyberpunk');
  });

  test('BE-034: Register new custom style preset', () => {
    const custom = styleService.saveStylePreset({
      name: 'Retro 80s Synthwave',
      category: 'Retro',
      promptModifier: 'synthwave grid aesthetic, chrome typography, glowing purple sunset',
      negativePrompt: 'modern photorealistic, black and white',
      paletteTags: ['Neon Purple', 'Sunburst Orange'],
      coherenceScore: 0.95
    });

    expect(custom.id).toBeDefined();
    expect(styleService.getStylePresetByName('Retro 80s Synthwave')).toBeDefined();
  });

  test('BE-035: Inject style modifiers and negative prompts into base prompt', () => {
    const injected = styleService.injectStyleToPrompt('Hero standing on skyscraper roof', 'Cyberpunk');

    expect(injected.styledPrompt).toContain('Hero standing on skyscraper roof');
    expect(injected.styledPrompt).toContain('neon lights');
    expect(injected.negativePrompt).toContain('daylight');
  });

  test('BE-036: Generate environment reference with coherence score', () => {
    const env = styleService.generateEnvironmentRef('Jhansi Fort Ramparts', 'Historic Documentary');

    expect(env.locationName).toBe('Jhansi Fort Ramparts');
    expect(env.stylePresetName).toBe('Historic Documentary');
    expect(env.environmentPrompt).toContain('Jhansi Fort Ramparts');
    expect(env.coherenceScore).toBeGreaterThanOrEqual(0.9);
  });

  test('BE-037: Fallback to Cinematic 3D preset when unknown style requested', () => {
    const injected = styleService.injectStyleToPrompt('Ancient temple entrance', 'NonExistentStyle');

    expect(injected.styledPrompt).toContain('unreal engine 5 render');
  });

  test('BE-038: Cache and reuse environment references for identical pairs', () => {
    const env1 = styleService.generateEnvironmentRef('Cyberpunk City Square', 'Cyberpunk');
    const env2 = styleService.generateEnvironmentRef('Cyberpunk City Square', 'Cyberpunk');

    expect(env1.id).toBe(env2.id);
  });
});
