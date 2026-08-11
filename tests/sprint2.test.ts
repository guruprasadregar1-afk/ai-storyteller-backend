import { AIProviderManager } from '../src/ai/AIProviderManager';
import { SceneService } from '../src/services/SceneService';

describe('Sprint 2 Backend Test Suite — Scene Beat Segmentation (BE-019 to BE-025)', () => {
  let aiManager: AIProviderManager;
  let sceneService: SceneService;

  beforeEach(() => {
    aiManager = new AIProviderManager();
    sceneService = new SceneService(aiManager);
  });

  test('BE-019: Segment script text into ordered visual scene beats', async () => {
    const scriptText = 'In a distant galaxy, a lone starship navigated the cosmic storm. Inside, the captain made a fateful decision to save the crew.';
    const beats = await sceneService.segmentScript('script-101', scriptText);

    expect(beats.length).toBe(2);
    expect(beats[0].beatIndex).toBe(1);
    expect(beats[1].beatIndex).toBe(2);
    expect(beats[0].narrationText).toContain('distant galaxy');
  });

  test('BE-020: Assign camera angle directives to scene beats', async () => {
    const scriptText = 'The ocean raged under the dark sky. The hero looked back one last time.';
    const beats = await sceneService.segmentScript('script-102', scriptText);

    expect(['WIDE_SHOT', 'MEDIUM_SHOT', 'CLOSE_UP', 'DRONE_PAN', 'MACRO_ZOOM', 'OVER_SHOULDER']).toContain(beats[0].cameraDirective);
  });

  test('BE-021: Assign lighting mood tags to scene beats', async () => {
    const scriptText = 'Sunrise broke over the mountain peak.';
    const beats = await sceneService.segmentScript('script-103', scriptText);

    expect(beats[0].lightingMood).toBeDefined();
  });

  test('BE-022: Generate detailed visual prompts for image generation models', async () => {
    const scriptText = 'The golden key turned in the ancient lock.';
    const beats = await sceneService.segmentScript('script-104', scriptText);

    expect(beats[0].visualPrompt).toContain('cinematic 8k render');
    expect(beats[0].visualPrompt).toContain('golden key');
  });

  test('BE-023: Calculate estimated audio duration based on word count', async () => {
    const scriptText = 'This is a test narration sentence containing ten words for duration estimation.';
    const beats = await sceneService.segmentScript('script-105', scriptText);

    expect(beats[0].estimatedSeconds).toBeGreaterThanOrEqual(3);
  });

  test('BE-024: Retrieve saved scene beats by script ID', async () => {
    await sceneService.segmentScript('script-106', 'A quick story beat.');
    const fetched = await sceneService.getScenesByScriptId('script-106');

    expect(fetched.length).toBe(1);
    expect(fetched[0].scriptId).toBe('script-106');
  });

  test('BE-025: Update scene beat properties (visual prompt, camera directive)', async () => {
    await sceneService.segmentScript('script-107', 'Initial scene beat text.');
    const updated = await sceneService.updateSceneBeat('script-107', '1', {
      cameraDirective: 'DRONE_PAN',
      lightingMood: 'NEON_CYBERPUNK'
    });

    expect(updated).not.toBeNull();
    expect(updated?.cameraDirective).toBe('DRONE_PAN');
    expect(updated?.lightingMood).toBe('NEON_CYBERPUNK');
  });
});
