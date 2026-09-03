import {
  countAttributedDialogueLines,
  buildStoryDialogueRequirementsBlock,
  prefersNarratorOnlyNarration,
} from '../src/common/utils/story-dialogue-guidance';

describe('story dialogue guidance', () => {
  test('counts attributed dialogue lines', () => {
    const text = 'Rancho said, "Hello." Virus snapped, "Go away."';
    expect(countAttributedDialogueLines(text)).toBeGreaterThanOrEqual(2);
  });

  test('guidance block mentions quoted dialogue requirement', () => {
    expect(buildStoryDialogueRequirementsBlock()).toContain('directly quoted speech');
    expect(buildStoryDialogueRequirementsBlock()).toContain('Khan snarled');
  });

  test('narrator-only block for factual content', () => {
    expect(buildStoryDialogueRequirementsBlock({ requireDialogue: false })).toContain('historical');
    expect(prefersNarratorOnlyNarration('HISTORY')).toBe(true);
  });
});
