import {
  prefersNarratorOnlyNarration,
  shouldRequireMultiVoiceDialogue,
  buildStoryDialogueRequirementsBlock,
  countAttributedDialogueLines,
} from '../src/common/utils/story-dialogue-guidance';
import { AIProviderManager } from '../src/ai/AIProviderManager';
import { ScriptService } from '../src/services/ScriptService';
import { RightsService } from '../src/services/RightsService';

describe('script narration path', () => {
  test('HISTORY and USER_CONTEXT prefer narrator-only from the start', () => {
    expect(prefersNarratorOnlyNarration('HISTORY')).toBe(true);
    expect(prefersNarratorOnlyNarration('USER_CONTEXT')).toBe(true);
    expect(prefersNarratorOnlyNarration('MOVIE')).toBe(false);
    expect(prefersNarratorOnlyNarration('BOOK')).toBe(false);
  });

  test('HISTORICAL_EXPLANATION mode prefers narrator-only', () => {
    expect(prefersNarratorOnlyNarration('MOVIE', { mode: 'HISTORICAL_EXPLANATION' })).toBe(true);
  });

  test('requireMultiVoiceDialogue override wins', () => {
    expect(prefersNarratorOnlyNarration('HISTORY', { requireMultiVoiceDialogue: true })).toBe(false);
    expect(prefersNarratorOnlyNarration('MOVIE', { requireMultiVoiceDialogue: false })).toBe(true);
  });

  test('narrator-only guidance block omits multi-voice dialogue requirements', () => {
    const block = buildStoryDialogueRequirementsBlock({ requireDialogue: false });
    expect(block).toContain('documentary narration');
    expect(block).not.toContain('REQUIRED for multi-voice');
  });

  test('Rani Lakshmibai preset script has zero attributed dialogue lines', () => {
    const raniSnippet =
      'Instead, Rani Lakshmibai stood tall upon the palace balcony, her eyes flashing with resolute determination as she uttered her immortal oath: "Main apni Jhansi nahi doongi!"';
    expect(countAttributedDialogueLines(raniSnippet)).toBe(0);
  });

  test('ScriptService accepts Rani Lakshmibai via narrator-only path', async () => {
    const aiManager = new AIProviderManager();
    const scriptService = new ScriptService(aiManager, new RightsService());
    const result = await scriptService.generateScript(
      'Rani Lakshmibai',
      'HISTORY',
      ['Rani Lakshmibai defended Jhansi against British forces in 1858.'],
      { mode: 'STANDARD', language: 'English' },
      { contentType: 'HISTORY', title: 'Rani Lakshmibai', canonicalTitle: 'Rani Lakshmibai', facts: [], characters: [], themes: [], setting: 'Jhansi', grounded: true } as any
    );
    expect(result.script).toContain('Jhansi');
    expect(result.narrationPath).toBe('narrator-only');
  });

  test('ScriptService keeps multi-voice path for 3 Idiots', async () => {
    const aiManager = new AIProviderManager();
    const scriptService = new ScriptService(aiManager, new RightsService());
    const result = await scriptService.generateScript(
      '3 Idiots',
      'MOVIE',
      [],
      { mode: 'STANDARD', language: 'English' },
      { contentType: 'MOVIE', title: '3 Idiots', canonicalTitle: '3 Idiots', facts: [], characters: [], themes: [], setting: 'Delhi', grounded: true } as any
    );
    expect(result.script).toContain('Rancho');
    expect(result.narrationPath).toBe('multi-voice');
    expect(shouldRequireMultiVoiceDialogue('MOVIE')).toBe(true);
  });

  test('ScriptService keeps multi-voice path for Jungle Book', async () => {
    const aiManager = new AIProviderManager();
    const scriptService = new ScriptService(aiManager, new RightsService());
    const result = await scriptService.generateScript(
      'The Jungle Book',
      'BOOK',
      [],
      { mode: 'STANDARD', language: 'English' },
      { contentType: 'BOOK', title: 'The Jungle Book', canonicalTitle: 'The Jungle Book', facts: [], characters: [], themes: [], setting: 'Seoni jungle', grounded: true } as any
    );
    expect(result.script).toContain('Mowgli');
    expect(result.narrationPath).toBe('multi-voice');
  });
});
