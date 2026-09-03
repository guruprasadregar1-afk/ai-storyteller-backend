export interface StoryValidationResult {
  valid: boolean;
  wordCount: number;
  paragraphCount: number;
  characterCount: number;
  hasBeginning: boolean;
  hasMiddle: boolean;
  hasEnding: boolean;
  hasCharacters: boolean;
  hasPlotEvents: boolean;
  hasResolution: boolean;
  containsPlaceholder: boolean;
  issues: string[];
}

export class StoryValidator {
  private forbiddenPlaceholders = [
    'captured the imagination',
    'an epic tale of',
    'a journey worth remembering',
    'factual research background compiled',
    'this is the story of',
    'legacy lives on',
    'unfolds with passion and intensity'
  ];

  validateStory(scriptText: string, mode: string = 'STANDARD', overrideMinWordCount?: number): StoryValidationResult {
    const issues: string[] = [];
    const text = scriptText.trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const characterCount = text.length;

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    let minWordCount = 400; // STANDARD default (supports 400-2000 word rich retellings)
    if (mode === 'SHORT') {
      minWordCount = 200;
    } else if (mode === 'DETAILED') {
      minWordCount = 1000;
    } else if (mode === 'SHORT_SUMMARY') {
      minWordCount = 100;
    }

    if (overrideMinWordCount !== undefined) {
      minWordCount = overrideMinWordCount;
    }

    // Check for forbidden placeholders
    const lowerText = text.toLowerCase();
    const containsPlaceholder = this.forbiddenPlaceholders.some(phrase => lowerText.includes(phrase));

    if (containsPlaceholder) {
      issues.push('Contains generic placeholder filler phrases.');
    }

    if (wordCount < minWordCount) {
      issues.push(`Word count (${wordCount}) is below minimum required for mode '${mode}' (${minWordCount}).`);
    }

    const hasBeginning = paragraphCount > 0 && wordCount >= 50;
    const hasMiddle = paragraphCount >= 2 && wordCount >= 150;
    const hasEnding = paragraphCount >= 3 || text.toLowerCase().includes('end') || text.toLowerCase().includes('finally') || text.toLowerCase().includes('ever after') || text.toLowerCase().includes('learned') || wordCount >= 200;
    const hasCharacters = /[A-Z][a-z]+/.test(text);
    const hasPlotEvents = words.length > 50;
    const hasResolution = hasEnding;

    if (!hasBeginning) issues.push('Missing clear story beginning.');
    if (!hasMiddle) issues.push('Missing plot development / middle.');
    if (!hasEnding) issues.push('Missing story ending / resolution.');

    const valid = issues.length === 0 && !containsPlaceholder && wordCount >= minWordCount;

    return {
      valid,
      wordCount,
      paragraphCount,
      characterCount,
      hasBeginning,
      hasMiddle,
      hasEnding,
      hasCharacters,
      hasPlotEvents,
      hasResolution,
      containsPlaceholder,
      issues
    };
  }
}

export const storyValidator = new StoryValidator();
