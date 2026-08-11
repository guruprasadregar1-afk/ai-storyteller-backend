export type ContentType = 'MOVIE' | 'BOOK' | 'STORY' | 'HISTORY' | 'FOLKLORE' | 'USER_CONTEXT';
export type RightsStatus = 'PUBLIC_DOMAIN' | 'LICENSED' | 'USER_PROVIDED' | 'UNKNOWN' | 'RESTRICTED';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'STALE';

export interface ClassifyResult {
  contentType: ContentType;
  confidence: number;
  canonicalTitle: string;
  reason: string;
  candidateTitles?: string[];
}

export interface ScriptGenerationParams {
  mode: 'SHORT_SUMMARY' | 'DETAILED_STORY' | 'ENDING_EXPLAINED' | 'CHARACTER_FOCUS' | 'CHILDREN_SIMPLIFIED' | 'HISTORICAL_EXPLANATION' | 'GENRE_STYLE';
  language?: string;
  constraints?: string[];
}

export interface ScriptResult {
  script: string;
  mode: string;
  language: string;
  rightsMode: string;
  qualityScore: number;
  provider: string;
  model: string;
}

export interface CharacterItem {
  name: string;
  role: string;
  ageGroup: string;
  genderPresentation: string;
  personality: string;
  appearance: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
}

export interface VoiceProfileResult {
  ageGroup: 'CHILD' | 'YOUNG_ADULT' | 'ADULT' | 'ELDERLY';
  genderPresentation: 'FEMALE' | 'MALE' | 'NEUTRAL';
  tone: string;
  emotion: string;
  pace: 'SLOW' | 'NORMAL' | 'FAST' | 'ENERGETIC';
  language: string;
  accent: string;
  style: string;
  audience: string;
  reasoning: string;
  confidence: number;
  selectedProvider: string;
  selectedModel: string;
}

export interface AIProviderResponse<T> {
  success: boolean;
  data?: T;
  provider: string;
  model: string;
  latencyMs: number;
  error?: string;
}
