import { StoryEmotionSegment } from '../types';

/** Split story on blank lines — same boundary rule as TranslationService. */
export function splitStoryParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

/** Hindi (and other) attribution verbs before quoted dialogue. */
const HINDI_ATTRIBUTION_RE =
  /^([\u0900-\u097F]+)\s+(?:ने\s+)?(?:कहा|गरज(?:ते)?(?:\s+हुए)?|गड़गड़(?:ा(?:या|ए)?)?|फुसफुस(?:ा(?:या|ए)?)|जवाब\s+द(?:िया|िए)|चेतावनी\s+द(?:ी|ि)|वादा\s+क(?:िया|िए)|चिल्ल(?:ा(?:या|ए)?)|धमक(?:ा(?:या|ए)?))/i;

/** English attribution before quote (Name verb, "..."). */
const ENGLISH_ATTRIBUTION_RE =
  /^([A-Z][a-zA-Z]+)\s+(?:\w+\s+){0,2}?(?:said|snarled|whispered|declared|shouted|asked|replied|growled|murmured|warned|promised|roared|rumbled|bellowed|answered|cried|exclaimed)\s*,/i;

const HINDI_NAME_TO_SPEAKER: Record<string, string> = {
  बाघीरा: 'Bagheera',
  बघीरा: 'Bagheera',
  बालू: 'Baloo',
  मोगली: 'Mowgli',
  मोवली: 'Mowgli',
  खान: 'Khan',
  'ख़ान': 'Khan',
  शेर: 'Khan',
  अकेला: 'Akela',
  रणचो: 'Rancho',
  वायरस: 'Virus',
  राजू: 'Raju',
  फरहान: 'Farhan',
};

function normalizeDevanagariWord(word: string): string {
  return word.normalize('NFC').replace(/\u093C/g, '').trim();
}

function resolveHindiSpeakerName(hindiName: string): string {
  const raw = hindiName.trim();
  if (HINDI_NAME_TO_SPEAKER[raw]) return HINDI_NAME_TO_SPEAKER[raw];
  const stripped = normalizeDevanagariWord(raw);
  if (HINDI_NAME_TO_SPEAKER[stripped]) return HINDI_NAME_TO_SPEAKER[stripped];
  return raw;
}

const SPEAKER_ALIASES: Record<string, string[]> = {
  Bagheera: ['Bagheera', 'bagheera'],
  Baloo: ['Baloo', 'baloo'],
  Mowgli: ['Mowgli', 'mowgli'],
  Khan: ['Khan', 'khan', 'Shere Khan', 'Shere'],
  Akela: ['Akela', 'akela'],
};

function normalizeSpeakerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function speakersMatch(expected: string, inferred: string): boolean {
  const e = normalizeSpeakerName(expected).toLowerCase();
  const i = normalizeSpeakerName(inferred).toLowerCase();
  if (e === i) return true;
  for (const aliases of Object.values(SPEAKER_ALIASES)) {
    const lower = aliases.map((a) => a.toLowerCase());
    if (lower.includes(e) && lower.includes(i)) return true;
  }
  if (e.includes(i) || i.includes(e)) return true;
  return false;
}

/** Infer speaker from attribution clause immediately before Hindi/English quote. */
export function inferSpeakerFromSegmentText(text: string, language: string): string | null {
  const trimmed = text.trim();
  const lang = language.toLowerCase();

  if (lang === 'hi' || lang.startsWith('hi')) {
    const match = trimmed.match(HINDI_ATTRIBUTION_RE);
    if (match) {
      return resolveHindiSpeakerName(match[1]);
    }
    return null;
  }

  const enMatch = trimmed.match(ENGLISH_ATTRIBUTION_RE);
  if (enMatch) {
    return enMatch[1].trim();
  }
  return null;
}

export function segmentContainsQuotedDialogue(text: string): boolean {
  return /["'\u201c\u201d«»""]/.test(text) || /"[^"]{2,}"/.test(text);
}

/**
 * Fail loudly when dialogue attribution in text disagrees with assigned speaker metadata.
 */
export function validateSpeakerSegmentAlignment(
  segments: StoryEmotionSegment[],
  language: string
): void {
  const errors: string[] = [];

  for (const seg of segments) {
    const assigned = seg.speaker || 'narrator';
    const hasQuotes = segmentContainsQuotedDialogue(seg.text);
    const inferred = inferSpeakerFromSegmentText(seg.text, language);

    if (hasQuotes && assigned === 'narrator' && inferred && inferred !== 'narrator') {
      errors.push(
        `segment ${seg.segmentIndex}: dialogue present but speaker=narrator (text suggests ${inferred})`
      );
      continue;
    }

    if (
      inferred &&
      inferred !== 'narrator' &&
      assigned !== 'narrator' &&
      !speakersMatch(assigned, inferred)
    ) {
      errors.push(
        `segment ${seg.segmentIndex}: metadata speaker=${assigned} but text attribution suggests ${inferred}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`SPEAKER_ALIGNMENT_FAILED: ${errors.join('; ')}`);
  }
}

export function buildParagraphOffsets(
  fullScript: string,
  paragraphs: string[]
): Array<{ index: number; start: number; end: number }> {
  const offsets: Array<{ index: number; start: number; end: number }> = [];
  let searchFrom = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const trimmed = paragraphs[i].trim();
    const start = fullScript.indexOf(trimmed, searchFrom);
    const safeStart = start >= 0 ? start : searchFrom;
    offsets.push({ index: i, start: safeStart, end: safeStart + trimmed.length });
    searchFrom = safeStart + Math.max(trimmed.length, 1);
  }
  return offsets;
}

export function paragraphIndexForPosition(
  offsets: Array<{ index: number; start: number; end: number }>,
  pos: number
): number {
  for (const o of offsets) {
    if (pos >= o.start && pos < o.end) return o.index;
  }
  return offsets.length > 0 ? offsets[offsets.length - 1].index : 0;
}
