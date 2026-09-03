import { EmotionAnalysisService, groupSentenceSegments, collapseSegmentsToParagraphs } from '../src/services/EmotionAnalysisService';
import { EmotionEngineSegment } from '../src/services/EmotionEngineClient';
import { EmotionMapResult } from '../src/types';
import {
  inferSpeakerFromSegmentText,
  splitStoryParagraphs,
  validateSpeakerSegmentAlignment,
} from '../src/services/segmentAlignment';

/** Minimal Jungle Book excerpt — dialogue paragraphs with distinct speakers. */
const JUNGLE_BOOK_EN = `Deep in the lush jungles of Seoni, Bagheera discovered Mowgli.

Baloo rumbled, "Repeat after me, Little Frog — we be of one blood, ye and I."

Mowgli answered, "We be of one blood, ye and I."

Bagheera warned, "Remember those words — they will save your life."

Mowgli learned that the jungle was governed by order and respect.

Khan snarled, "You do not belong here, man-cub."

Mowgli replied, "I belong with my family."

Khan promised, "When Akela misses his kill, I will take the man-cub."

Akela warned, "Do not let fear divide the pack."

Bagheera murmured, "You must bring the Red Flower."

Mowgli said, "I will return before the moon sets."

Khan roared, "You dare use man's weapon against me?"

Mowgli drove the ferocious tiger back into the darkness.

Baloo bellowed, "That is my pupil!"

Bagheera replied, "You have done what no wolf could do, Mowgli."`;

/** Hindi paragraphs aligned 1:1 with English — simulates correct paragraph-by-paragraph translation. */
const JUNGLE_BOOK_HI = `सियोनी की हरी-भरी जंगल में, बाघीरा को मोगली मिला।

बालू गड़गड़ाया, "मेरे पीछे दोहराओ, छोटे मेंढक — हम एक ही रक्त के हैं, तुम और मैं।"

मोगली ने जवाब दिया, "हम एक ही रक्त के हैं, तुम और मैं।"

बाघीरा ने चेतावनी दी, "ये शब्द याद रखना — ये तुम्हारी जान बचाएंगे।"

मोगली ने सीखा कि जंगल व्यवस्था और सम्मान से चलता है।

खान गरजते हुए कहा, "तुम यहाँ के नहीं हो, मानव-शावक।"

मोगली ने जवाब दिया, "मैं अपने परिवार के साथ हूँ।"

खान ने वादा किया, "जब अकेला अपना शिकार चूक जाएगा, मैं मानव-शावक को ले जाऊँगा।"

अकेला ने चेतावनी दी, "डर को झुंड को बाँटने न दो।"

बाघीरा फुसफुसाया, "तुम्हें लाल फूल लाना होगा।"

मोगली ने कहा, "मैं चाँद डूबने से पहले लौटूँगा।"

खान गरजा, "तुम मेरी आग का हथियार इस्तेमाल करने की हिम्मत करते हो?"

मोगली ने भयंकर बाघ को अंधेरे में पीछे धकेल दिया।

बालू चिल्लाया, "यह मेरा शिष्य है!"

बाघीरा ने जवाब दिया, "तुमने वो किया जो कोई भेड़िया नहीं कर सकता था, मोगली।"`;

describe('segment alignment — paragraph-index pairing across translation', () => {
  const emotionService = new EmotionAnalysisService();

  test('groupSentenceSegments does not merge across paragraph boundaries', () => {
    const eeSegments: Array<EmotionEngineSegment & { paragraphIndex: number }> = [
      { speaker: 'narrator', text: 'Intro.', emotion: 'neutral', intensity: 0.3, role: 'adult_female', paragraphIndex: 0 },
      { speaker: 'Baloo', text: 'Line one.', emotion: 'neutral', intensity: 0.3, role: 'adult_male', paragraphIndex: 1 },
      { speaker: 'Baloo', text: 'Line two.', emotion: 'neutral', intensity: 0.3, role: 'adult_male', paragraphIndex: 2 },
    ];

    const grouped = groupSentenceSegments(eeSegments);
    expect(grouped).toHaveLength(3);
    expect(grouped[1].speaker).toBe('Baloo');
    expect(grouped[2].speaker).toBe('Baloo');
  });

  test('old proportional pairing would shift speakers — new 1:1 pairing keeps them correct', async () => {
    if (!(await import('../src/services/EmotionEngineClient').then((m) => m.EmotionEngineClient.isAvailable()))) {
      console.warn('Skipping: Emotion Engine not available — using synthetic canonical map');
      const paragraphs = splitStoryParagraphs(JUNGLE_BOOK_EN);
      const speakerByIndex = [
        'narrator', 'Baloo', 'Mowgli', 'Bagheera', 'narrator',
        'Khan', 'Mowgli', 'Khan', 'Akela', 'Bagheera',
        'Mowgli', 'Khan', 'narrator', 'Baloo', 'Bagheera',
      ];
      const roleByIndex = [
        'adult_female', 'adult_male', 'child_male', 'adult_male', 'adult_female',
        'adult_male', 'child_male', 'adult_male', 'elderly_male', 'adult_male',
        'child_male', 'adult_male', 'adult_female', 'adult_male', 'adult_male',
      ];
      const syntheticCanonical: EmotionMapResult = {
        language: 'en',
        overallMood: 'test',
        segments: paragraphs.map((p, idx) => ({
          segmentIndex: idx + 1,
          paragraphIndex: idx,
          text: p.trim(),
          emotion: 'CALM',
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: speakerByIndex[idx],
          role: roleByIndex[idx],
        })),
      };

      const preserved = emotionService.preserveEmotionAcrossTranslation(
        syntheticCanonical,
        JUNGLE_BOOK_HI,
        'hi',
        JUNGLE_BOOK_EN
      );

      assertJungleBookSegmentAlignment(preserved);
      return;
    }

    const canonical = await emotionService.analyzeStoryEmotions('jungle-book-align', JUNGLE_BOOK_EN, 'en');
    expect(canonical.segments.length).toBe(splitStoryParagraphs(JUNGLE_BOOK_EN).length);

    const preserved = emotionService.preserveEmotionAcrossTranslation(
      canonical,
      JUNGLE_BOOK_HI,
      'hi',
      JUNGLE_BOOK_EN
    );

    assertJungleBookSegmentAlignment(preserved);
  });

  test('SEGMENT_ALIGNMENT_FAILED when translated paragraph count drifts', () => {
    const canonical: EmotionMapResult = {
      language: 'en',
      overallMood: 'test',
      segments: [
        {
          segmentIndex: 1,
          paragraphIndex: 0,
          text: 'One.',
          emotion: 'CALM',
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'narrator',
        },
        {
          segmentIndex: 2,
          paragraphIndex: 1,
          text: 'Two.',
          emotion: 'CALM',
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'Baloo',
          role: 'adult_male',
        },
      ],
    };

    let thrown: Error | undefined;
    try {
      emotionService.preserveEmotionAcrossTranslation(
        canonical,
        'एक।\n\nदो।\n\nतीन।',
        'hi',
        'One.\n\nTwo.'
      );
    } catch (err: any) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/SEGMENT_ALIGNMENT_FAILED/);
    expect(thrown!.message).toContain('Translated paragraph count (3)');
    expect(thrown!.message).toContain('canonical emotion segment count (2)');
  });

  test('SPEAKER_ALIGNMENT_FAILED when metadata disagrees with Hindi attribution', () => {
    const mismatched = [
      {
        segmentIndex: 5,
        paragraphIndex: 4,
        text: 'बालू गड़गड़ाया, "मेरे पीछे दोहराओ।"',
        emotion: 'CALM' as const,
        intensity: 0.4,
        pace: 1,
        pitch: 0,
        volume: 0,
        pauseStyle: 'NORMAL' as const,
        speaker: 'Bagheera',
        role: 'adult_male',
      },
    ];

    let thrown: Error | undefined;
    try {
      validateSpeakerSegmentAlignment(mismatched, 'hi');
    } catch (err: any) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.message).toMatch(/SPEAKER_ALIGNMENT_FAILED/);
    expect(thrown!.message).toContain('segment 5');
    expect(thrown!.message).toContain('metadata speaker=Bagheera');
    expect(thrown!.message).toContain('Baloo');
  });

  test('preserveEmotionAcrossTranslation rejects mismatched speaker through full path', () => {
    const canonical: EmotionMapResult = {
      language: 'en',
      overallMood: 'test',
      segments: [
        {
          segmentIndex: 1,
          paragraphIndex: 0,
          text: 'Baloo rumbled, "Hello."',
          emotion: 'CALM',
          intensity: 0.4,
          pace: 1,
          pitch: 0,
          volume: 0,
          pauseStyle: 'NORMAL',
          speaker: 'Bagheera',
          role: 'adult_male',
        },
      ],
    };

    expect(() =>
      emotionService.preserveEmotionAcrossTranslation(
        canonical,
        'बालू गड़गड़ाया, "नमस्ते।"',
        'hi',
        'Baloo rumbled, "Hello."'
      )
    ).toThrow(/SPEAKER_ALIGNMENT_FAILED/);
  });

  test('collapseSegmentsToParagraphs keeps peak emotion when opening line is calmer', () => {
    const collapsed = collapseSegmentsToParagraphs(
      [
        {
          segmentIndex: 1,
          paragraphIndex: 0,
          text: 'She trembled.',
          emotion: 'FEARFUL',
          intensity: 0.9,
          pace: 1.15,
          pitch: 1,
          volume: 2,
          pauseStyle: 'DRAMATIC',
          speaker: 'narrator',
        },
        {
          segmentIndex: 2,
          paragraphIndex: 0,
          text: 'Then she smiled.',
          emotion: 'JOYFUL',
          intensity: 0.3,
          pace: 1.08,
          pitch: 1,
          volume: 1,
          pauseStyle: 'SHORT',
          speaker: 'narrator',
        },
      ],
      ['She trembled. Then she smiled.']
    );

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].emotion).toBe('FEARFUL');
    expect(collapsed[0].pace).toBe(1.15);
    expect(collapsed[0].intensity).toBeCloseTo(0.9, 5);
  });

  test('inferSpeakerFromSegmentText maps Hindi attribution to English speaker name', () => {
    expect(inferSpeakerFromSegmentText('बालू गड़गड़ाया, "नमस्ते।"', 'hi')).toBe('Baloo');
    expect(inferSpeakerFromSegmentText('खान गरजते हुए कहा, "रुको।"', 'hi')).toBe('Khan');
    expect(inferSpeakerFromSegmentText('मोगली ने जवाब दिया, "हाँ।"', 'hi')).toBe('Mowgli');
  });

  test('Khan dialogue tags as adult_male when character_map includes Shere Khan', async () => {
    const { EmotionEngineClient } = await import('../src/services/EmotionEngineClient');
    if (!(await EmotionEngineClient.isAvailable())) {
      console.warn('Skipping live /tag Khan role test: Emotion Engine unavailable');
      return;
    }

    const { buildEmotionEngineCharacterMap } = await import('../src/services/emotionCharacterMap');
    const characterMap = buildEmotionEngineCharacterMap([
      { name: 'Shere Khan', genderPresentation: 'MALE', ageGroup: 'ADULT' } as any,
      { name: 'Mowgli', genderPresentation: 'MALE', ageGroup: 'CHILD' } as any,
    ]);

    const tagged = await EmotionEngineClient.tagText('Khan snarled, "You do not belong here."', characterMap);
    const khanSeg = tagged.segments.find((s) => s.speaker === 'Khan');
    expect(khanSeg).toBeDefined();
    expect(khanSeg!.role).toBe('adult_male');
  });
});

function assertJungleBookSegmentAlignment(preserved: EmotionMapResult) {
  const seg = (idx: number) => preserved.segments[idx];

  expect(seg(1).speaker).toMatch(/Baloo/i);
  expect(seg(1).text).toMatch(/बालू गड़गड़ाया/);

  expect(seg(4).speaker).toBe('narrator');
  expect(seg(4).text).not.toMatch(/गरज/);

  expect(seg(5).speaker).toMatch(/Khan/i);
  expect(seg(5).text).toMatch(/खान.*गरज/);

  expect(seg(6).speaker).toMatch(/Mowgli/i);
  expect(seg(6).text).toMatch(/मोगली.*जवाब/);

  expect(seg(7).speaker).toMatch(/Khan/i);
  expect(seg(7).text).toMatch(/खान.*वादा/);

  preserved.segments.forEach((s, idx) => {
    console.log(`[aligned ${idx + 1}] speaker=${s.speaker} role=${s.role} | ${s.text.substring(0, 55)}...`);
  });
}
