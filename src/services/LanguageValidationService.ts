export interface LanguageValidationResult {
  isValid: boolean;
  detectedLanguage: string;
  confidence: number;
  scriptPurity?: number;
  reason?: string;
}

/** Minimum shared-opener pairs whose remainder text must look like lazy duplication. */
const TEMPLATE_REMAINDER_SIMILARITY_THRESHOLD = 0.72;

export class LanguageValidationService {
  /**
   * Validates per-paragraph language purity, checking for:
   * 1. High target script character percentage per paragraph (>=80% for non-Latin scripts)
   * 2. NO lazy templated openers repeated across paragraphs WITH near-duplicate body text
   * 3. NO untranslated English narrative clauses or spliced words (e.g. "नायकic", "साहसीst")
   */
  static validateTextLanguage(text: string, targetLanguageCode: string): LanguageValidationResult {
    const cleanText = text.trim();
    if (!cleanText) {
      return { isValid: false, detectedLanguage: 'unknown', confidence: 0, reason: 'Text is empty' };
    }

    const lang = targetLanguageCode.toLowerCase().trim();

    // English requires no foreign validation
    if (lang === 'en' || lang.startsWith('en-')) {
      return { isValid: true, detectedLanguage: 'en', confidence: 1.0, scriptPurity: 1.0 };
    }

    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // 1. CHECK: lazy templated openers — same opener AND substantively similar body text
    const templateViolation = this.detectLazyTemplateOpener(paragraphs);
    if (templateViolation) {
      return {
        isValid: false,
        detectedLanguage: 'en',
        confidence: 0.95,
        reason: templateViolation
      };
    }

    // 2. CHECK: NO HYBRID SPLICED WORDS (e.g. "नायकic", "साहसीst")
    const hybridRegex = /[\u0900-\u097F]+(ic|ed|ing|st|ly|er|s|es)\b|\b[a-zA-Z]+[\u0900-\u097F]+/g;
    const hybridMatches = cleanText.match(hybridRegex);
    if (hybridMatches && hybridMatches.length > 0) {
      return {
        isValid: false,
        detectedLanguage: 'en',
        confidence: 0.95,
        reason: `HYBRID_SPLICED_WORDS_DETECTED: Found malformed language-spliced words: "${hybridMatches.join('", "')}"`
      };
    }

    // Common English indicator phrases that MUST NOT appear in non-English narrative body
    const englishNarrativePhrases = [
      'once upon a time',
      'in a prosperous kingdom',
      'there lived a maiden',
      'tragedy struck',
      'fairy godmother',
      'glass slipper',
      'the clock struck midnight',
      'lived happily ever after',
      'in the historic heartland of india',
      'upon her marriage to maharaja',
      'deep in the lush',
      'at the prestigious imperial college',
      'in april of 1912'
    ];

    const lowerText = cleanText.toLowerCase();
    const foundEnglishPhrases = englishNarrativePhrases.filter(phrase => lowerText.includes(phrase));

    if (foundEnglishPhrases.length >= 1) {
      return {
        isValid: false,
        detectedLanguage: 'en',
        confidence: 0.90,
        reason: `UNTRANSLATED_ENGLISH_LEAKAGE: Text contains untranslated English narrative clauses: "${foundEnglishPhrases.join('", "')}"`
      };
    }

    // 3. PER-PARAGRAPH SCRIPT PURITY VALIDATION
    let totalTargetChars = 0;
    let totalCheckableChars = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();

      // Remove untranslatable proper nouns and numbers to compute pure language script ratio
      const cleanP = p
        .replace(/\b(Rancho|Farhan|Raju|Virus|Phunsukh|Wangdu|Mowgli|Bagheera|Baloo|Akela|Shere Khan|Cinderella|Tremaine|Anastasia|Drizella|Rose|Jack|Dawson|Bukater|Titanic|Lakshmibai|Manikarnika|Varanasi|Jhansi|Gangadhar|Damodar|Tope|Kotah|Kalpi|Gwalior|ICE|Delhi|Shimla|Ladakh)\b/gi, '')
        .replace(/[0-9\s.,!?:;"'()\-—]/g, '');

      if (cleanP.length === 0) continue;

      if (lang === 'hi' || lang === 'mr') {
        const devanagariMatches = cleanP.match(/[\u0900-\u097F]/g) || [];
        const purity = devanagariMatches.length / cleanP.length;
        totalTargetChars += devanagariMatches.length;
        totalCheckableChars += cleanP.length;

        if (purity < 0.80) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} has only ${(purity * 100).toFixed(1)}% Devanagari characters (required >=80%). Untranslated English text detected.`
          };
        }
      } else if (lang === 'zh') {
        const cjkMatches = cleanP.match(/[\u4E00-\u9FFF]/g) || [];
        const purity = cjkMatches.length / cleanP.length;
        totalTargetChars += cjkMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Chinese script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (lang === 'ja') {
        const jaMatches = cleanP.match(/[\u3040-\u30FF\u4E00-\u9FFF]/g) || [];
        const purity = jaMatches.length / cleanP.length;
        totalTargetChars += jaMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Japanese script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (lang === 'ar' || lang === 'ur') {
        const arMatches = cleanP.match(/[\u0600-\u06FF]/g) || [];
        const purity = arMatches.length / cleanP.length;
        totalTargetChars += arMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Arabic/Urdu script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (lang === 'bn') {
        const bnMatches = cleanP.match(/[\u0980-\u09FF]/g) || [];
        const purity = bnMatches.length / cleanP.length;
        totalTargetChars += bnMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Bengali script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (lang === 'te') {
        const teMatches = cleanP.match(/[\u0C00-\u0C7F]/g) || [];
        const purity = teMatches.length / cleanP.length;
        totalTargetChars += teMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Telugu script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (lang === 'ta') {
        const taMatches = cleanP.match(/[\u0B80-\u0BFF]/g) || [];
        const purity = taMatches.length / cleanP.length;
        totalTargetChars += taMatches.length;
        totalCheckableChars += cleanP.length;
        if (purity < 0.75) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.90,
            scriptPurity: purity,
            reason: `LOW_PARAGRAPH_PURITY: Paragraph ${i + 1} Tamil script purity is ${(purity * 100).toFixed(1)}% (required >=75%).`
          };
        }
      } else if (['es', 'fr', 'de', 'pt', 'it'].includes(lang)) {
        // Latin Script Language Vocabulary Check per Paragraph
        const vocabMap: Record<string, string[]> = {
          es: ['el', 'la', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'pero', 'había', 'una', 'vez', 'reino', 'príncipe', 'cenicienta', 'cuando', 'para', 'con', 'pero', 'madrastra', 'zapatilla', 'joven', 'enfermó', 'lágrimas', 'mañana', 'baile', 'palacio', 'varita', 'hada', 'reloj', 'medianoche', 'pie', 'triunfo', 'colegio', 'estudiante', 'profesor', 'amigos', 'escuela', 'excelencia', 'ingeniería', 'fotografía', 'selva', 'niño', 'oso', 'pantera', 'tigre', 'fuego', 'camino', 'viaje', 'valle', 'montañas', 'gran', 'todos', 'tragedia', 'golpeó', 'rebeldes', 'reina', 'indomable', 'corona', 'vida', 'libertad', 'história', 'paz'],
          fr: ['le', 'la', 'les', 'un', 'une', 'dans', 'avec', 'pour', 'sur', 'par', 'mais', 'était', 'une', 'fois', 'royaume', 'prince', 'cendrillon', 'quand', 'avec', 'pour', 'mais', 'marraine', 'pantoufle', 'jeune', 'fille', 'tragédie', 'larmes', 'matin', 'bal', 'palais', 'baguette', 'fée', 'horloge', 'minuit', 'pied', 'triomphe', 'professeur', 'école', 'ami', 'jungle', 'ours', 'panthère', 'tigre', 'histoire', 'reine', 'liberté', 'victoire', 'cœur', 'paix', 'deux', 'étudiants', 'rencontrent', 'nommé'],
          de: ['der', 'die', 'das', 'ein', 'eine', 'in', 'mit', 'für', 'auf', 'aus', 'war', 'einmal', 'königreich', 'prinz', 'aschenputtel', 'als', 'mit', 'für', 'aber', 'stiefmutter', 'schuh', 'junges', 'mädchen', 'tragödie', 'tränen', 'morgen', 'ball', 'palast', 'zauberstab', 'fee', 'uhr', 'mitternacht', 'fuß', 'sieg', 'student', 'schule', 'freund', 'dschungel', 'bär', 'panther', 'tiger', 'geschichte', 'königin', 'freiheit', 'herz', 'frieden', 'zwei', 'traffen', 'namens'],
          pt: ['o', 'a', 'os', 'as', 'um', 'uma', 'em', 'com', 'para', 'por', 'mas', 'era', 'uma', 'vez', 'reino', 'príncipe', 'cinderela', 'quando', 'para', 'com', 'mas', 'fada', 'madrinha', 'sapatinho', 'jovem', 'floresta', 'jornada', 'herói', 'corajoso', 'história', 'rainha', 'liberdade', 'coração', 'paz'],
          it: ['il', 'la', 'i', 'le', 'un', 'una', 'in', 'con', 'per', 'su', 'ma', 'c\'era', 'una', 'volta', 'regno', 'principe', 'cenerentola', 'quando', 'per', 'con', 'ma', 'fata', 'madrina', 'scarpetta', 'giovane', 'giungla', 'viaggio', 'eroe', 'coraggioso', 'storia', 'regina', 'libertà', 'cuore', 'pace']
        };

        const targetVocab = vocabMap[lang] || [];
        const pLower = p.toLowerCase();
        const matches = targetVocab.filter(w => pLower.includes(w));

        if (matches.length === 0 && p.split(/\s+/).length > 15) {
          return {
            isValid: false,
            detectedLanguage: 'en',
            confidence: 0.85,
            reason: `UNTRANSLATED_PARAGRAPH: Paragraph ${i + 1} does not contain expected ${lang.toUpperCase()} vocabulary words.`
          };
        }
      }
    }

    const overallPurity = totalCheckableChars > 0 ? totalTargetChars / totalCheckableChars : 1.0;

    return {
      isValid: true,
      detectedLanguage: lang,
      confidence: 0.98,
      scriptPurity: Math.round(overallPurity * 1000) / 1000
    };
  }

  /** First clause before sentence punctuation — used as paragraph opener fingerprint. */
  static extractParagraphOpener(paragraph: string): string {
    const firstPhrase = paragraph.trim().split(/[,.!?]/)[0].trim().toLowerCase();
    return firstPhrase.length > 5 ? firstPhrase : '';
  }

  /** Text after the shared opener clause (dialogue/narration body). */
  static extractParagraphRemainder(paragraph: string, opener: string): string {
    const trimmed = paragraph.trim();
    const lower = trimmed.toLowerCase();
    const openerLower = opener.toLowerCase();
    if (lower.startsWith(openerLower)) {
      return trimmed.slice(opener.length).replace(/^[\s,.!?—-]+/, '').trim();
    }
    const parts = trimmed.split(/[,.!?]/);
    return parts.slice(1).join('.').trim();
  }

  /** Word-level Jaccard similarity after normalization (0..1). */
  static computeTextSimilarity(a: string, b: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const na = normalize(a);
    const nb = normalize(b);
    if (!na && !nb) return 1;
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const wordsA = na.split(/\s+/).filter(Boolean);
    const wordsB = nb.split(/\s+/).filter(Boolean);
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let intersection = 0;
    for (const w of setA) {
      if (setB.has(w)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Flag only when paragraphs share an opener AND their bodies look like near-duplicates
   * (lazy templated translation). Same character attribution with different dialogue passes.
   */
  static detectLazyTemplateOpener(paragraphs: string[]): string | null {
    if (paragraphs.length < 2) return null;

    const openerGroups: Record<string, number[]> = {};
    for (let i = 0; i < paragraphs.length; i++) {
      const opener = this.extractParagraphOpener(paragraphs[i]);
      if (!opener) continue;
      if (!openerGroups[opener]) openerGroups[opener] = [];
      openerGroups[opener].push(i);
    }

    for (const [opener, indices] of Object.entries(openerGroups)) {
      if (indices.length < 2) continue;

      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const pA = paragraphs[indices[a]];
          const pB = paragraphs[indices[b]];
          const remA = this.extractParagraphRemainder(pA, opener);
          const remB = this.extractParagraphRemainder(pB, opener);
          const remainderSim = this.computeTextSimilarity(remA, remB);
          const fullSim = this.computeTextSimilarity(pA, pB);

          const suspicious =
            remainderSim >= TEMPLATE_REMAINDER_SIMILARITY_THRESHOLD ||
            (remA.length >= 20 && remB.length >= 20 && fullSim >= TEMPLATE_REMAINDER_SIMILARITY_THRESHOLD);

          if (suspicious) {
            return (
              `HARDCODED_TEMPLATE_OPENER_DETECTED: Repeated opening phrase "${opener}" with ` +
              `near-duplicate paragraph content (remainder similarity ${(remainderSim * 100).toFixed(0)}%, ` +
              `full similarity ${(fullSim * 100).toFixed(0)}%).`
            );
          }
        }
      }
    }

    return null;
  }
}
