import { StoryEmotionSegment, StoryEmotion, EmotionMapResult, PauseStyle } from '../types';
import { LanguageValidationService } from './LanguageValidationService';
import { EmotionEngineClient, EmotionEngineSegment } from './EmotionEngineClient';
import { getEmotionEngineConfig, EmotionIntensityThresholds } from '../config/emotion.config';
import {
  splitStoryParagraphs,
  buildParagraphOffsets,
  paragraphIndexForPosition,
  validateSpeakerSegmentAlignment,
} from './segmentAlignment';

// ─────────────────────────────────────────────────────────────────
// Emotion Engine → Storyteller Emotion Mapping
// Maps the Emotion Engine's ML labels + intensity to the
// Storyteller's StoryEmotion type with prosody parameters.
// ─────────────────────────────────────────────────────────────────

interface EmotionProfile {
  emotion: StoryEmotion;
  intensity: number;
  pace: number;
  pitch: number;
  volume: number;
  pauseStyle: PauseStyle;
}

function mapEmotionEngineToStoryEmotion(
  eeEmotion: string,
  eeIntensity: number,
  thresholds: EmotionIntensityThresholds
): EmotionProfile {
  const e = eeEmotion.toLowerCase().trim();

  switch (e) {
    case 'joy':
      return eeIntensity > thresholds.joyHigh
        ? { emotion: 'JOYFUL',      intensity: eeIntensity, pace: 1.08, pitch: 1,  volume: 1,  pauseStyle: 'SHORT' }
        : { emotion: 'HOPEFUL',     intensity: eeIntensity, pace: 1.03, pitch: 1,  volume: 0,  pauseStyle: 'NORMAL' };

    case 'sadness':
      return eeIntensity > thresholds.sadnessHigh
        ? { emotion: 'SAD',         intensity: eeIntensity, pace: 0.85, pitch: -1, volume: -1, pauseStyle: 'LONG' }
        : { emotion: 'MELANCHOLIC', intensity: eeIntensity, pace: 0.90, pitch: -1, volume: 0,  pauseStyle: 'LONG' };

    case 'fear':
      return eeIntensity > thresholds.fearHigh
        ? { emotion: 'FEARFUL',     intensity: eeIntensity, pace: 1.15, pitch: 1,  volume: 2,  pauseStyle: 'DRAMATIC' }
        : { emotion: 'SUSPENSEFUL', intensity: eeIntensity, pace: 1.10, pitch: 1,  volume: 1,  pauseStyle: 'DRAMATIC' };

    case 'anger':
      return eeIntensity > thresholds.angerHigh
        ? { emotion: 'ANGRY',       intensity: eeIntensity, pace: 1.12, pitch: 2,  volume: 2,  pauseStyle: 'SHORT' }
        : { emotion: 'URGENT',      intensity: eeIntensity, pace: 1.08, pitch: 1,  volume: 1,  pauseStyle: 'SHORT' };

    case 'surprise':
      return eeIntensity > thresholds.surpriseHigh
        ? { emotion: 'AWE',         intensity: eeIntensity, pace: 0.95, pitch: 1,  volume: 0,  pauseStyle: 'NORMAL' }
        : { emotion: 'SURPRISED',   intensity: eeIntensity, pace: 1.05, pitch: 1,  volume: 1,  pauseStyle: 'NORMAL' };

    case 'disgust':
      return { emotion: 'SERIOUS',    intensity: eeIntensity, pace: 0.95, pitch: 0,  volume: 0,  pauseStyle: 'NORMAL' };

    case 'neutral':
    default:
      return { emotion: 'CALM',       intensity: Math.max(eeIntensity, 0.3), pace: 1.0, pitch: 0, volume: 0, pauseStyle: 'NORMAL' };
  }
}

/**
 * Group consecutive same-emotion sentences within a single speaker.
 * Never merges segments across different speakers or paragraph boundaries
 * (required for multi-voice narration + translation alignment).
 */
export function groupSentenceSegments(
  eeSegments: Array<EmotionEngineSegment & { paragraphIndex?: number }>
): StoryEmotionSegment[] {
  if (eeSegments.length === 0) return [];

  const { thresholds } = getEmotionEngineConfig();
  const groups: StoryEmotionSegment[] = [];

  let currentSpeaker = eeSegments[0].speaker || 'narrator';
  let currentRole = eeSegments[0].role;
  let currentParagraphIndex = eeSegments[0].paragraphIndex ?? 0;
  let currentProfile = mapEmotionEngineToStoryEmotion(
    eeSegments[0].emotion,
    eeSegments[0].intensity,
    thresholds
  );
  let currentTexts: string[] = [eeSegments[0].text];
  let totalIntensity = eeSegments[0].intensity;
  let count = 1;

  const flushGroup = () => {
    groups.push({
      segmentIndex: groups.length + 1,
      paragraphIndex: currentParagraphIndex,
      text: currentTexts.join(' '),
      emotion: currentProfile.emotion,
      intensity: totalIntensity / count,
      pace: currentProfile.pace,
      pitch: currentProfile.pitch,
      volume: currentProfile.volume,
      pauseStyle: currentProfile.pauseStyle,
      speaker: currentSpeaker,
      role: currentRole,
    });
  };

  for (let i = 1; i < eeSegments.length; i++) {
    const seg = eeSegments[i];
    const speaker = seg.speaker || 'narrator';
    const profile = mapEmotionEngineToStoryEmotion(seg.emotion, seg.intensity, thresholds);
    const paragraphBreak =
      seg.paragraphIndex !== undefined &&
      eeSegments[i - 1].paragraphIndex !== undefined &&
      seg.paragraphIndex !== eeSegments[i - 1].paragraphIndex;

    if (!paragraphBreak && speaker === currentSpeaker && profile.emotion === currentProfile.emotion) {
      currentTexts.push(seg.text);
      totalIntensity += seg.intensity;
      count++;
      continue;
    }

    flushGroup();
    currentSpeaker = speaker;
    currentRole = seg.role;
    currentParagraphIndex = seg.paragraphIndex ?? currentParagraphIndex;
    currentProfile = profile;
    currentTexts = [seg.text];
    totalIntensity = seg.intensity;
    count = 1;
  }

  flushGroup();
  return groups;
}

function annotateSegmentsWithParagraphIndex(
  segments: EmotionEngineSegment[],
  fullScript: string
): Array<EmotionEngineSegment & { paragraphIndex: number }> {
  const paragraphs = splitStoryParagraphs(fullScript);
  const offsets = buildParagraphOffsets(fullScript, paragraphs);
  let searchFrom = 0;

  return segments.map((seg) => {
    const needle = seg.text.trim();
    let pos = fullScript.indexOf(needle, searchFrom);
    if (pos < 0) pos = fullScript.indexOf(needle);
    if (pos < 0) pos = searchFrom;
    const paragraphIndex = paragraphIndexForPosition(offsets, pos);
    searchFrom = pos + Math.max(needle.length, 1);
    return { ...seg, paragraphIndex };
  });
}

/** Minimum intensity for a peak sentence to override the paragraph's opening-line emotion. */
const PEAK_EMOTION_MIN_INTENSITY = 0.55;

const FLAT_EMOTIONS = new Set<StoryEmotion>(['CALM', 'NEUTRAL']);

function pickParagraphPrimarySegment(segs: StoryEmotionSegment[]): {
  primary: StoryEmotionSegment;
  intensity: number;
} {
  const defaultPrimary = segs.find((s) => s.speaker && s.speaker !== 'narrator') ?? segs[0];
  const peak = segs.reduce((best, s) => (s.intensity > best.intensity ? s : best), segs[0]);

  if (
    peak.intensity >= PEAK_EMOTION_MIN_INTENSITY &&
    peak.intensity > defaultPrimary.intensity + 0.05
  ) {
    return { primary: peak, intensity: peak.intensity };
  }

  const firstElevated = segs.find(
    (s) => !FLAT_EMOTIONS.has(s.emotion) && s.intensity >= PEAK_EMOTION_MIN_INTENSITY
  );
  if (firstElevated && firstElevated.intensity > defaultPrimary.intensity) {
    return { primary: firstElevated, intensity: firstElevated.intensity };
  }

  const matchingEmotion = segs.filter((s) => s.emotion === defaultPrimary.emotion);
  const intensityPool = matchingEmotion.length > 0 ? matchingEmotion : segs;
  const avgIntensity =
    intensityPool.reduce((sum, s) => sum + s.intensity, 0) / intensityPool.length;
  return { primary: defaultPrimary, intensity: avgIntensity };
}

/** One emotion segment per story paragraph — matches TranslationService 1:1 boundaries. */
export function collapseSegmentsToParagraphs(
  segments: StoryEmotionSegment[],
  englishParagraphs: string[]
): StoryEmotionSegment[] {
  const paragraphCount = englishParagraphs.length;
  const buckets: StoryEmotionSegment[][] = Array.from({ length: paragraphCount }, () => []);

  for (const seg of segments) {
    const pIdx = Math.min(Math.max(seg.paragraphIndex ?? 0, 0), paragraphCount - 1);
    buckets[pIdx].push(seg);
  }

  return englishParagraphs.map((pText, pIdx) => {
    const segs = buckets[pIdx];
    if (segs.length === 0) {
      return {
        segmentIndex: pIdx + 1,
        paragraphIndex: pIdx,
        text: pText.trim(),
        emotion: 'CALM' as StoryEmotion,
        intensity: 0.4,
        pace: 1.0,
        pitch: 0,
        volume: 0,
        pauseStyle: 'NORMAL' as PauseStyle,
        speaker: 'narrator',
      };
    }

    const { primary, intensity } = pickParagraphPrimarySegment(segs);

    return {
      ...primary,
      paragraphIndex: pIdx,
      segmentIndex: pIdx + 1,
      text: pText.trim(),
      intensity,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Keyword-based fallback (the original implementation)
// Used only when Emotion Engine is unreachable.
// ─────────────────────────────────────────────────────────────────

function analyzeWithKeywords(fullScript: string): StoryEmotionSegment[] {
  const paragraphs = fullScript.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const segments: StoryEmotionSegment[] = [];

  paragraphs.forEach((pText, idx) => {
    const lower = pText.toLowerCase();
    let emotion: StoryEmotion = 'CALM';
    let intensity = 0.4;
    let pace = 1.0;
    let pitch = 0;
    let volume = 0;
    let pauseStyle: PauseStyle = 'NORMAL';

    if (lower.includes('tragedy') || lower.includes('died') || lower.includes('tears') || lower.includes('heartbreak') || lower.includes('cried') || lower.includes('lost') || lower.includes('alone') || lower.includes('freezing dark') || lower.includes('दुख') || lower.includes('tragedia') || lower.includes('tragédie') || lower.includes('trauer')) {
      emotion = 'SAD'; intensity = 0.75; pace = 0.88; pitch = -1; volume = -1; pauseStyle = 'LONG';
    } else if (lower.includes('ball') || lower.includes('excited') || lower.includes('laughter') || lower.includes('dance') || lower.includes('music') || lower.includes('glittered') || lower.includes('खुशी') || lower.includes('fiesta') || lower.includes('bal') || lower.includes('tanz')) {
      emotion = 'JOYFUL'; intensity = 0.70; pace = 1.08; pitch = 1; volume = 1; pauseStyle = 'SHORT';
    } else if (lower.includes('midnight') || lower.includes('panic') || lower.includes('chime') || lower.includes('running') || lower.includes('iceberg') || lower.includes('gash') || lower.includes('flooding') || lower.includes('आधी रात') || lower.includes('medianoche') || lower.includes('minuit') || lower.includes('mitternacht')) {
      emotion = 'SUSPENSEFUL'; intensity = 0.85; pace = 1.15; pitch = 1; volume = 2; pauseStyle = 'DRAMATIC';
    } else if (lower.includes('godmother') || lower.includes('wand') || lower.includes('sparkled') || lower.includes('luminous') || lower.includes('magic') || lower.includes('परी') || lower.includes('magia') || lower.includes('féerie') || lower.includes('zauber')) {
      emotion = 'AWE'; intensity = 0.80; pace = 0.95; pitch = 1; volume = 0; pauseStyle = 'NORMAL';
    } else if (lower.includes('fitted') || lower.includes('triumph') || lower.includes('wedding') || lower.includes('rejoiced') || lower.includes('saved') || lower.includes('peace') || lower.includes('जीत') || lower.includes('triunfo') || lower.includes('triomphe') || lower.includes('sieg')) {
      emotion = 'TRIUMPHANT'; intensity = 0.88; pace = 1.05; pitch = 2; volume = 2; pauseStyle = 'NORMAL';
    } else if (lower.includes('remembered') || lower.includes('legacy') || lower.includes('years passed') || lower.includes('quiet night') || lower.includes('याद') || lower.includes('recuerdo') || lower.includes('souvenir') || lower.includes('erinnerung')) {
      emotion = 'REFLECTIVE'; intensity = 0.50; pace = 0.90; pitch = 0; volume = 0; pauseStyle = 'LONG';
    }

    segments.push({
      segmentIndex: idx + 1,
      paragraphIndex: idx,
      text: pText.trim(),
      emotion,
      intensity,
      pace,
      pitch,
      volume,
      pauseStyle,
      speaker: 'narrator',
    });
  });

  if (segments.length === 0) {
    segments.push({
      segmentIndex: 1,
      text: fullScript,
      emotion: 'CALM',
      intensity: 0.5,
      pace: 1.0,
      pitch: 0,
      volume: 0,
      pauseStyle: 'NORMAL',
      speaker: 'narrator',
    });
  }

  return segments;
}

// ─────────────────────────────────────────────────────────────────
// EmotionAnalysisService
// Primary: Emotion Engine ML API (http://127.0.0.1:8000/tag)
// Fallback: Keyword-based matching
// ─────────────────────────────────────────────────────────────────

export class EmotionAnalysisService {
  private emotionCache = new Map<string, EmotionMapResult>();

  async analyzeStoryEmotions(
    scriptId: string,
    fullScript: string,
    language = 'en',
    options?: { characterMap?: Record<string, string> }
  ): Promise<EmotionMapResult> {
    const cacheKey = `${scriptId}:${language}`;
    if (this.emotionCache.has(cacheKey)) {
      console.log(`[EmotionAnalysisService] Emotion map cache hit for '${scriptId}' in '${language}'.`);
      return this.emotionCache.get(cacheKey)!;
    }

    console.log(`[EmotionAnalysisService] Analyzing emotional arc for script '${scriptId}' in '${language}'...`);

    let segments: StoryEmotionSegment[];
    let taggerMode = 'keyword-fallback';
    let analysisSource: EmotionMapResult['analysisSource'] = 'keyword-fallback';
    const engineConfig = getEmotionEngineConfig();

    try {
      const available = engineConfig.enabled && (await EmotionEngineClient.isAvailable());
      if (available) {
        console.log(`[EmotionAnalysisService] Emotion Engine is available at ${engineConfig.url} — using ML tagger...`);
        const eeResponse = await EmotionEngineClient.tagText(fullScript, options?.characterMap);
        const annotated = annotateSegmentsWithParagraphIndex(eeResponse.segments, fullScript);
        const grouped = groupSentenceSegments(annotated);
        const paragraphs = splitStoryParagraphs(fullScript);
        segments = collapseSegmentsToParagraphs(grouped, paragraphs);
        taggerMode = eeResponse.tagger_mode || 'ml';
        analysisSource = 'emotion-engine';

        const emotionDistribution = new Map<string, number>();
        segments.forEach(s => emotionDistribution.set(s.emotion, (emotionDistribution.get(s.emotion) || 0) + 1));
        const distributionStr = Array.from(emotionDistribution.entries()).map(([e, c]) => `${e}:${c}`).join(', ');
        console.log(`[EmotionAnalysisService] ML tagger returned ${eeResponse.segment_count} sentences → ${grouped.length} grouped → ${segments.length} paragraph-aligned segments (${distributionStr})`);
      } else {
        console.warn(`[EmotionAnalysisService] Emotion Engine unavailable — falling back to keyword analysis.`);
        segments = collapseSegmentsToParagraphs(analyzeWithKeywords(fullScript), splitStoryParagraphs(fullScript));
      }
    } catch (err: any) {
      console.warn(`[EmotionAnalysisService] Emotion Engine call failed: ${err.message}. Falling back to keyword analysis.`);
      segments = collapseSegmentsToParagraphs(analyzeWithKeywords(fullScript), splitStoryParagraphs(fullScript));
    }

    // Derive overall mood from segment distribution
    const emotionCounts = new Map<string, number>();
    segments.forEach(s => emotionCounts.set(s.emotion, (emotionCounts.get(s.emotion) || 0) + 1));
    const dominantEmotion = Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CALM';
    const uniqueEmotions = emotionCounts.size;
    const overallMood = uniqueEmotions >= 3
      ? 'Dynamic Emotional Arc'
      : uniqueEmotions === 2
        ? `${dominantEmotion}-driven narrative`
        : `${dominantEmotion} narrative`;

    const result: EmotionMapResult = {
      language,
      segments,
      overallMood,
      taggerMode,
      analysisSource,
    };

    this.emotionCache.set(cacheKey, result);
    console.log(`[EmotionAnalysisService] Emotion analysis complete: ${segments.length} segments, source=${analysisSource}, tagger=${taggerMode}, mood="${overallMood}"`);
    return result;
  }

  preserveEmotionAcrossTranslation(
    canonicalEmotionMap: EmotionMapResult,
    translatedScript: string,
    targetLanguage: string,
    canonicalScript?: string
  ): EmotionMapResult {
    console.log(`[EmotionAnalysisService] Preserving canonical emotion map across translation to '${targetLanguage}'...`);

    if (targetLanguage !== 'en') {
      const val = LanguageValidationService.validateTextLanguage(translatedScript, targetLanguage);
      if (!val.isValid) {
        console.warn(`[EmotionAnalysisService] Translated script failed language validation for '${targetLanguage}': ${val.reason}`);
      }
    }

    const translatedParagraphs = splitStoryParagraphs(translatedScript);
    const expectedCount = canonicalEmotionMap.segments.length;

    if (translatedParagraphs.length !== expectedCount) {
      throw new Error(
        `SEGMENT_ALIGNMENT_FAILED: Translated paragraph count (${translatedParagraphs.length}) ` +
          `does not match canonical emotion segment count (${expectedCount}). ` +
          `Positional speaker/emotion metadata would drift — aborting instead of silent misalignment.`
      );
    }

    if (canonicalScript) {
      const englishParagraphs = splitStoryParagraphs(canonicalScript);
      if (englishParagraphs.length !== expectedCount) {
        throw new Error(
          `SEGMENT_ALIGNMENT_FAILED: Canonical English paragraph count (${englishParagraphs.length}) ` +
            `does not match emotion segment count (${expectedCount}). Re-run emotion analysis on the English script.`
        );
      }
    }

    const alignedSegments: StoryEmotionSegment[] = canonicalEmotionMap.segments.map((canonSeg, idx) => {
      const targetText = translatedParagraphs[idx].trim();
      return {
        ...canonSeg,
        paragraphIndex: idx,
        segmentIndex: idx + 1,
        text: targetText,
      };
    });

    if (targetLanguage !== 'en') {
      validateSpeakerSegmentAlignment(alignedSegments, targetLanguage);
    }

    alignedSegments.forEach((seg, idx) => {
      console.log(
        `[Emotion] Segment ${idx + 1} language: ${targetLanguage} | speaker: ${seg.speaker} | role: ${seg.role} | ` +
          `Emotion: ${seg.emotion} | Preview: "${seg.text.substring(0, 50)}..."`
      );
    });

    return {
      language: targetLanguage,
      segments: alignedSegments,
      overallMood: canonicalEmotionMap.overallMood,
      taggerMode: canonicalEmotionMap.taggerMode,
      analysisSource: canonicalEmotionMap.analysisSource,
    };
  }
}

export const emotionAnalysisService = new EmotionAnalysisService();
