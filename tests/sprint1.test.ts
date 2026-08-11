import { ContentService } from '../src/services/ContentService';
import { RightsService } from '../src/services/RightsService';
import { AIProviderManager } from '../src/ai/AIProviderManager';
import { ClaudeProvider } from '../src/ai/ClaudeProvider';
import { GeminiProvider } from '../src/ai/GeminiProvider';
import { GroqProvider } from '../src/ai/GroqProvider';

describe('Sprint 1 Backend Test Suite (BE-001 to BE-018)', () => {
  let contentService: ContentService;
  let rightsService: RightsService;
  let aiManager: AIProviderManager;

  beforeEach(() => {
    contentService = new ContentService();
    rightsService = new RightsService();
    aiManager = new AIProviderManager();
  });

  test('BE-001: Normalize title consistently', () => {
    const raw1 = '  3 Idiots !!! ';
    const raw2 = '3   idiots';
    expect(contentService.normalizeTitle(raw1)).toBe('3 idiots');
    expect(contentService.normalizeTitle(raw2)).toBe('3 idiots');
  });

  test('BE-002: Exact match returns existing cached content', async () => {
    const match = await contentService.findExistingContent('Titanic');
    expect(match).not.toBeNull();
    expect(match?.title).toBe('Titanic');
    expect(match?.contentType).toBe('MOVIE');
  });

  test('BE-003: Alias match resolves canonical title', async () => {
    const match = await contentService.findExistingContent('Three Idiots');
    expect(match).not.toBeNull();
    expect(match?.title).toBe('3 Idiots');
  });

  test('BE-004: Semantic/partial match resolves correct content', async () => {
    const match = await contentService.findExistingContent('Jhansi Ki Rani');
    expect(match).not.toBeNull();
    expect(match?.title).toBe('Rani Lakshmibai');
  });

  test('BE-005: New content persistence creates reusable record', async () => {
    const saved = await contentService.saveContentRecord({
      title: 'Interstellar',
      contentType: 'MOVIE',
      description: 'Sci-fi film about space exploration.',
      aliases: ['Interstellar Movie']
    });
    expect(saved.id).toBeDefined();
    expect(saved.normalizedTitle).toBe('interstellar');

    const fetched = await contentService.findExistingContent('Interstellar Movie');
    expect(fetched?.title).toBe('Interstellar');
  });

  test('BE-006 & BE-007: Cache hit skips unnecessary research', async () => {
    const hit = await contentService.findExistingContent('3 Idiots');
    expect(hit?.verificationStatus).toBe('VERIFIED');
    expect(hit?.references.length).toBeGreaterThan(0);
  });

  test('BE-008 & BE-009: Rights policy allows original retelling and prevents protected copy', () => {
    const movieRights = rightsService.evaluateRights('MOVIE', 'Titanic');
    expect(movieRights.allowed).toBe(true);
    expect(movieRights.rightsMode).toContain('ORIGINAL');

    const check = rightsService.validateOriginality('Once upon a time on the high seas...');
    expect(check.isOriginal).toBe(true);
  });

  test('BE-010: Character extraction returns structured character bibles', async () => {
    const characters = await aiManager.extractCharacters('A story about a courageous young girl.');
    expect(characters.length).toBeGreaterThan(0);
    expect(characters[0].name).toBeDefined();
    expect(characters[0].genderPresentation).toBeDefined();
  });

  test('BE-011: Narrator intelligence selects multi-signal VoiceProfile', async () => {
    const characters = await aiManager.extractCharacters('A dark horror movie narrative.');
    const narrator = await aiManager.selectNarrator({ title: 'Dracula', contentType: 'MOVIE' }, 'A dark atmosphere', characters);
    expect(narrator.ageGroup).toBeDefined();
    expect(narrator.tone).toBeDefined();
    expect(narrator.reasoning).toBeDefined();
  });

  test('BE-012, BE-013, BE-014: Provider adapters and health checks', async () => {
    const claude = new ClaudeProvider();
    const gemini = new GeminiProvider();
    const groq = new GroqProvider();

    expect(claude.name).toBe('claude');
    expect(gemini.name).toBe('gemini');
    expect(groq.name).toBe('groq');

    const health = await aiManager.getHealthStatus();
    expect(health.providers).toHaveProperty('claude');
    expect(health.providers).toHaveProperty('gemini');
    expect(health.providers).toHaveProperty('groq');
  });

  test('BE-018: Secrets audit ensures API keys never leak in outputs', async () => {
    const script = await aiManager.generateStoryScript('3 Idiots', [], { mode: 'SHORT_SUMMARY' });
    expect(JSON.stringify(script)).not.toContain('sk-ant');
    expect(JSON.stringify(script)).not.toContain('AIzaSy');
    expect(JSON.stringify(script)).not.toContain('gsk_');
  });
});
