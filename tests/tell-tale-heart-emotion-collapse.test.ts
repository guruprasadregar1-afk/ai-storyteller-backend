/**
 * Tell-Tale Heart paragraph-level emotion collapse — horror escalation must
 * surface on multi-sentence climax paragraphs (11, 12, 17), not only on
 * short single-sentence paragraphs.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  groupSentenceSegments,
  collapseSegmentsToParagraphs,
} from '../src/services/EmotionAnalysisService';
import { EmotionEngineClient } from '../src/services/EmotionEngineClient';
import {
  splitStoryParagraphs,
  buildParagraphOffsets,
  paragraphIndexForPosition,
} from '../src/services/segmentAlignment';
import { StoryEmotion } from '../src/types';

function extractTellTaleHeartScript(): string {
  const providerPath = path.join(__dirname, '../src/ai/ClaudeProvider.ts');
  const src = fs.readFileSync(providerPath, 'utf-8');
  const match = src.match(
    /lowerTitle\.includes\('tell-tale heart'\)[\s\S]*?fullScript = `([\s\S]*?)`;\s+\} else \{/
  );
  if (!match?.[1]) {
    throw new Error('Could not extract Tell-Tale Heart script from ClaudeProvider.ts');
  }
  return match[1];
}

function annotateWithParagraphIndex(
  segments: Array<{ text: string; speaker: string; emotion: string; intensity: number; role: string }>,
  fullScript: string
) {
  const paragraphs = splitStoryParagraphs(fullScript);
  const offsets = buildParagraphOffsets(fullScript, paragraphs);
  let searchFrom = 0;
  return segments.map((seg) => {
    const needle = seg.text.trim();
    let pos = fullScript.indexOf(needle, searchFrom);
    if (pos < 0) pos = fullScript.indexOf(needle);
    if (pos < 0) pos = searchFrom;
    searchFrom = pos + Math.max(needle.length, 1);
    return { ...seg, paragraphIndex: paragraphIndexForPosition(offsets, pos) };
  });
}

const HORROR_EMOTIONS = new Set<StoryEmotion>(['FEARFUL', 'SUSPENSEFUL', 'ANGRY', 'URGENT']);

describe('Tell-Tale Heart paragraph emotion collapse', () => {
  const story = extractTellTaleHeartScript();
  const paragraphs = splitStoryParagraphs(story);

  test('collapseSegmentsToParagraphs picks peak emotion over calm opening line', () => {
    const collapsed = collapseSegmentsToParagraphs(
      [
        {
          segmentIndex: 1,
          paragraphIndex: 0,
          text: 'But even yet I refrained and kept still.',
          emotion: 'CALM',
          intensity: 0.3,
          pace: 1.0,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'narrator',
        },
        {
          segmentIndex: 2,
          paragraphIndex: 0,
          text: 'He shrieked once — once only.',
          emotion: 'FEARFUL',
          intensity: 0.85,
          pace: 1.15,
          pitch: 1,
          volume: 2,
          pauseStyle: 'DRAMATIC',
          speaker: 'narrator',
        },
        {
          segmentIndex: 3,
          paragraphIndex: 0,
          text: 'The old man was dead.',
          emotion: 'FEARFUL',
          intensity: 0.8,
          pace: 1.15,
          pitch: 1,
          volume: 2,
          pauseStyle: 'DRAMATIC',
          speaker: 'narrator',
        },
      ],
      [paragraphs[10]]
    );

    expect(collapsed[0].emotion).toBe('FEARFUL');
    expect(collapsed[0].intensity).toBeGreaterThanOrEqual(0.8);
  });

  test('peak override does not fire for single mildly tense sentence in calm paragraph', () => {
    const collapsed = collapseSegmentsToParagraphs(
      [
        {
          segmentIndex: 1,
          paragraphIndex: 0,
          text: 'The room was quiet.',
          emotion: 'CALM',
          intensity: 0.3,
          pace: 1.0,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'narrator',
        },
        {
          segmentIndex: 2,
          paragraphIndex: 0,
          text: 'A faint creak sounded.',
          emotion: 'SUSPENSEFUL',
          intensity: 0.45,
          pace: 1.1,
          pitch: 1,
          volume: 1,
          pauseStyle: 'DRAMATIC',
          speaker: 'narrator',
        },
        {
          segmentIndex: 3,
          paragraphIndex: 0,
          text: 'Otherwise all was still.',
          emotion: 'CALM',
          intensity: 0.3,
          pace: 1.0,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'narrator',
        },
      ],
      ['The room was quiet. A faint creak sounded. Otherwise all was still.']
    );

    expect(collapsed[0].emotion).toBe('CALM');
    expect(collapsed[0].intensity).toBeCloseTo(0.3, 5);
  });

  test('paragraphs 11, 12, and 17 surface horror emotion from live Emotion Engine tags', async () => {
    if (!(await EmotionEngineClient.isAvailable())) {
      console.warn('Skipping: Emotion Engine unavailable');
      return;
    }

    const tagged = await EmotionEngineClient.tagText(story, { narrator: 'adult_male' });
    const annotated = annotateWithParagraphIndex(tagged.segments, story);
    const grouped = groupSentenceSegments(annotated);
    const collapsed = collapseSegmentsToParagraphs(grouped, paragraphs);

    expect(collapsed).toHaveLength(paragraphs.length);

    const targets = [
      { index: 11, label: 'murder climax' },
      { index: 12, label: 'dismemberment' },
      { index: 17, label: 'breakdown escalation' },
    ];

    for (const { index, label } of targets) {
      const seg = collapsed[index - 1];
      expect(seg).toBeDefined();
      expect(HORROR_EMOTIONS.has(seg.emotion)).toBe(true);
      expect(seg.intensity).toBeGreaterThan(0.55);
      console.log(
        `[tell-tale para ${index} ${label}] emotion=${seg.emotion} intensity=${seg.intensity.toFixed(2)}`
      );
    }
  }, 180_000);
});
