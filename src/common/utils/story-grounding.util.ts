import { ResearchResult } from '../../services/ResearchService';

/** Patterns that indicate ResearchService fell through to ungrounded placeholder data. */
const GENERIC_RESEARCH_PATTERNS = [
  /compelling protagonist embarking on a journey/i,
  /initial harmony is interrupted by a central challenge/i,
  /centers around key pivotal milestones/i,
  /pivotal encounters and decisive choices/i,
  /vivid world of adventure and heart/i,
  /original story research compiled for/i,
  /structured narrative facts gathered for/i,
  /lead character/i,
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'is', 'are',
]);

export function isGenericResearchFallback(research: ResearchResult): boolean {
  if (research.grounded === false) return true;
  const blob = [
    research.description,
    research.setting || '',
    ...(research.facts || []),
    ...(research.characters || []).map(c => c.name),
  ].join(' ');
  if (GENERIC_RESEARCH_PATTERNS.some(pattern => pattern.test(blob))) return true;
  if (
    research.characters?.length === 1 &&
    /^lead character$/i.test(research.characters[0].name)
  ) {
    return true;
  }
  return false;
}

function significantTitleTokens(title: string): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !STOP_WORDS.has(token));
}

/** Distinctive terms from research used to verify the script matches the requested work. */
export function extractDistinctiveResearchTerms(research: ResearchResult): string[] {
  const terms = new Set<string>();

  for (const token of significantTitleTokens(research.canonicalTitle || research.title)) {
    terms.add(token);
  }

  for (const character of research.characters || []) {
    const name = character.name.trim();
    if (name && !/^lead character$/i.test(name) && !/^the protagonist$/i.test(name)) {
      for (const part of name.toLowerCase().split(/\s+/)) {
        if (part.length >= 4 && !STOP_WORDS.has(part)) terms.add(part);
      }
    }
  }

  for (const fact of research.facts || []) {
    const words = fact.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length >= 5 && !STOP_WORDS.has(word)) {
        terms.add(word);
      }
      if (i < words.length - 1) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (words[i].length >= 4 && words[i + 1].length >= 4) {
          terms.add(bigram);
        }
      }
    }
  }

  return [...terms];
}

export interface StoryGroundingResult {
  valid: boolean;
  issues: string[];
  matchedTerms: string[];
}

/** Reject scripts that bear no relationship to grounded research for the requested title. */
export function validateStoryGrounding(scriptText: string, research: ResearchResult): StoryGroundingResult {
  const issues: string[] = [];
  const scriptLower = scriptText.toLowerCase();

  if (isGenericResearchFallback(research)) {
    return {
      valid: false,
      issues: ['Research was not grounded in verified source material for this title.'],
      matchedTerms: [],
    };
  }

  const titleTokens = significantTitleTokens(research.canonicalTitle || research.title || '');
  const matchedTitleTokens = titleTokens.filter(token => scriptLower.includes(token));

  const distinctiveTerms = extractDistinctiveResearchTerms(research);
  const matchedTerms = distinctiveTerms.filter(term => scriptLower.includes(term));
  const requiredMatches = Math.min(3, Math.max(2, Math.ceil(distinctiveTerms.length * 0.15)));

  if (distinctiveTerms.length >= 4 && matchedTerms.length < requiredMatches) {
    issues.push(
      `Script lacks connection to researched source material (${matchedTerms.length}/${requiredMatches} key terms found).`
    );
  }

  const plotGrounded = distinctiveTerms.length >= 4 && matchedTerms.length >= requiredMatches;
  if (
    !plotGrounded &&
    titleTokens.length >= 2 &&
    matchedTitleTokens.length < Math.min(2, titleTokens.length)
  ) {
    issues.push(
      `Script does not reference the requested title "${research.title}" (matched ${matchedTitleTokens.length}/${titleTokens.length} title terms).`
    );
  }

  const namedCharacters = (research.characters || []).filter(
    c => c.name && !/^lead character$/i.test(c.name) && !/^the protagonist$/i.test(c.name) && !/^unnamed/i.test(c.name)
  );
  if (namedCharacters.length > 0) {
    const matchedCharacters = namedCharacters.filter(c =>
      scriptLower.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().split(/\s+/).some(part => part.length >= 4 && scriptLower.includes(part))
    );
    if (matchedCharacters.length === 0) {
      issues.push('Script does not reference any researched character names.');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    matchedTerms,
  };
}

/** Fuzzy lookup key for structured research knowledge base entries. */
export function findKnowledgeBaseKey(cleanQuery: string, keys: string[]): string | null {
  for (const key of keys) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) return key;
  }
  const normalizedQuery = cleanQuery.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const key of keys) {
    const normalizedKey = key.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalizedQuery.includes(normalizedKey) || normalizedKey.includes(normalizedQuery)) return key;
  }
  return null;
}
