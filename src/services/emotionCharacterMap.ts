import { CharacterItem } from '../types';

/** Map storyteller character metadata → Emotion Engine voice roles (6-role model). */
export function buildEmotionEngineCharacterMap(
  characters?: CharacterItem[],
  narratorRole?: string
): Record<string, string> {
  if (!characters?.length && !narratorRole) return {};

  const map: Record<string, string> = {};
  for (const character of characters || []) {
    map[character.name] = mapCharacterToVoiceRole(character);
  }
  if (narratorRole) {
    map.narrator = narratorRole;
  }
  return expandSpeakerAliases(map);
}

/**
 * Dialogue attributions use single-word names (Khan, Virus) while character lists
 * often use full names (Shere Khan). Mirror aliases so /tag role inference matches.
 */
export function expandSpeakerAliases(roleMap: Record<string, string>): Record<string, string> {
  const expanded: Record<string, string> = { ...roleMap };

  for (const [name, role] of Object.entries(roleMap)) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.toLowerCase() === 'narrator') continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      const lastWord = parts[parts.length - 1];
      if (lastWord.length > 1 && !expanded[lastWord]) {
        expanded[lastWord] = role;
      }
    }
  }

  const explicitAliases: Record<string, string> = {
    Khan: 'Shere Khan',
    Shere: 'Shere Khan',
  };
  for (const [alias, canonical] of Object.entries(explicitAliases)) {
    if (expanded[canonical] && !expanded[alias]) {
      expanded[alias] = expanded[canonical];
    }
  }

  return expanded;
}

/** English Piper pools for diversifying multiple characters in the same role bucket. */
const ENGLISH_ROLE_DIVERSITY_POOLS: Record<string, readonly string[]> = {
  adult_male: ['en_US-ryan-medium', 'en_US-hfc_male-medium', 'en_US-norman-medium'],
  adult_female: ['en_US-amy-medium', 'en_US-kristin-medium', 'en_US-kathleen-low'],
  child_male: ['en_US-hfc_male-medium'],
  child_female: ['en_US-kristin-medium'],
  elderly_male: ['en_US-norman-medium'],
  elderly_female: ['en_US-kathleen-low'],
};

/**
 * Assign distinct voice IDs when 2+ named characters share the same role bucket.
 * Skipped for Hindi (one adult voice per gender). Single-character roles keep role default.
 */
export function buildEmotionEngineCharacterVoiceMap(
  roleMap: Record<string, string>,
  language = 'en'
): Record<string, string> {
  const lang = (language || 'en').trim().toLowerCase().slice(0, 2);
  if (lang !== 'en' || !roleMap || Object.keys(roleMap).length === 0) {
    return {};
  }

  const byRole = new Map<string, string[]>();
  for (const [name, role] of Object.entries(roleMap)) {
    if (name.trim().toLowerCase() === 'narrator') continue;
    const bucket = role.trim().toLowerCase();
    const list = byRole.get(bucket) || [];
    list.push(name);
    byRole.set(bucket, list);
  }

  const overrides: Record<string, string> = {};
  for (const [role, names] of byRole.entries()) {
    if (names.length < 2) continue;
    const pool = ENGLISH_ROLE_DIVERSITY_POOLS[role];
    if (!pool || pool.length < 2) continue;
    const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    sorted.forEach((name, index) => {
      overrides[name] = pool[index % pool.length];
    });
  }
  return overrides;
}

function mapCharacterToVoiceRole(character: CharacterItem): string {
  const age = (character.ageGroup || '').toLowerCase();
  const gender = (character.genderPresentation || '').toLowerCase();
  const isMale = gender.includes('male') || gender.includes('man') || gender.includes('boy');
  const isFemale = gender.includes('female') || gender.includes('woman') || gender.includes('girl');

  if (age.includes('child') || age.includes('teen') || age.includes('young')) {
    if (isMale) return 'child_male';
    if (isFemale) return 'child_female';
    return 'child_female';
  }
  if (age.includes('elder') || age.includes('old')) {
    if (isMale) return 'elderly_male';
    if (isFemale) return 'elderly_female';
    return 'elderly_female';
  }
  if (isMale) return 'adult_male';
  if (isFemale) return 'adult_female';
  return 'adult_female';
}
