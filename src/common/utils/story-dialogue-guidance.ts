/**
 * Shared story-generation guidance for multi-voice narration.
 * Our segmenter assigns per-character voices only when quoted dialogue
 * includes clear attribution (e.g. "Hello," she said).
 */

export const MIN_DIALOGUE_LINES_FOR_MULTI_VOICE = 3;

/** Content types where invented attributed dialogue is inappropriate or unlikely. */
export const NARRATOR_ONLY_CONTENT_TYPES = new Set(['HISTORY', 'USER_CONTEXT']);

export const NARRATOR_ONLY_GUIDANCE = `
NARRATION MODE (factual / historical / educational):
- Use third-person documentary narration throughout.
- Do NOT invent private dialogue or conversational quotes attributed to real historical figures.
- You MAY weave in widely documented quotations ONLY when they are famous recorded statements, integrated as narration (e.g. "She declared that she would never surrender Jhansi").
- Do NOT use the multi-voice dialogue format (Name verb, "quote.") for fabricated speech.
- Focus on chronology, verified events, and context from the research facts.
`.trim();

export const STORY_DIALOGUE_GUIDANCE = `
CHARACTER DIALOGUE (REQUIRED for multi-voice narration):
- Include directly quoted speech for every major named character who appears in more than one scene.
- Each such character must have at least 1-2 quoted lines somewhere in the story.
- CRITICAL FORMAT: place attribution BEFORE the quote at the START of the sentence:
  Name verb, "dialogue."  Example: Khan snarled, "You do not belong here, man-cub."
- Use a single-word speaker name in attributions (Rancho, Virus, Khan — not "Shere Khan").
- Do NOT add words between the verb and the opening quote (avoid: Rancho whispered to Raju, "...").
- Do NOT add leading clauses before the speaker name (avoid: When Raju faced expulsion, Rancho promised, "...").
- Put each attributed dialogue line in its own paragraph (blank line before and after) — one quote per paragraph.
- Do NOT put multiple quoted lines in the same paragraph; our segmenter merges them incorrectly.
- Avoid periods inside quoted speech; use em dashes instead (avoid: "Life is a race. If you don't run fast...").
- Mix quoted dialogue with third-person narration — aim for at least 6-10 attributed dialogue lines total.
- When the same character speaks more than once, vary the attribution verb each time (said, murmured, warned, replied, added, insisted) so translations produce distinct openers instead of repeating "Name said" / "ने कहा" every time.
- Keep character names consistent with the KEY CHARACTERS list.
`.trim();

export const STORY_DIALOGUE_EXAMPLE = `
Example (Jungle Book):
  Khan snarled, "You do not belong here, man-cub."
  NOT: Shere Khan declared that Mowgli did not belong in the wild.
  NOT: "You do not belong here," Khan snarled. (post-quote attribution — avoid)
  NOT: Returning to Council Rock, Mowgli shouted, "Stay back!" (leading clause — avoid)
`.trim();

export function buildStoryDialogueRequirementsBlock(options?: { requireDialogue?: boolean }): string {
  if (options?.requireDialogue === false) {
    return NARRATOR_ONLY_GUIDANCE;
  }
  return `${STORY_DIALOGUE_GUIDANCE}\n\n${STORY_DIALOGUE_EXAMPLE}`;
}

/** Whether to skip multi-voice dialogue requirements from the first generation attempt. */
export function prefersNarratorOnlyNarration(
  contentType?: string,
  params?: { mode?: string; requireMultiVoiceDialogue?: boolean }
): boolean {
  if (params?.requireMultiVoiceDialogue === false) return true;
  if (params?.requireMultiVoiceDialogue === true) return false;
  const mode = (params?.mode || '').toUpperCase();
  if (mode === 'HISTORICAL_EXPLANATION') return true;
  const type = (contentType || '').toUpperCase();
  return NARRATOR_ONLY_CONTENT_TYPES.has(type);
}

export function shouldRequireMultiVoiceDialogue(
  contentType?: string,
  params?: { mode?: string; requireMultiVoiceDialogue?: boolean }
): boolean {
  return !prefersNarratorOnlyNarration(contentType, params);
}

/** Count attributed quote lines for validation / retry loops. */
export function countAttributedDialogueLines(scriptText: string): number {
  const beforeQuote =
    /\b[A-Z][a-zA-Z]+\s+(?:\w+\s+){0,3}?(?:said|snarled|whispered|declared|shouted|asked|replied|growled|murmured|uttered|roared|warned|promised|told|demanded|cried|exclaimed|bellowed|hissed|spoke|answered|continued|insisted|reassured|mocked|laughed|challenged|protested|begged|commanded|observed|added|called|yelled|purred|snapped|bellowed|promised|warned)\s*,\s*"[^"]{3,}"/gi;
  return (scriptText.match(beforeQuote) || []).length;
}
