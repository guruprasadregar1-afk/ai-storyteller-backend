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

export interface SceneBeatItem {
  id?: string;
  scriptId?: string;
  beatIndex: number;
  narrationText: string;
  visualPrompt: string;
  cameraDirective: 'WIDE_SHOT' | 'MEDIUM_SHOT' | 'CLOSE_UP' | 'DRONE_PAN' | 'MACRO_ZOOM' | 'OVER_SHOULDER';
  lightingMood: 'DRAMATIC_NATURAL' | 'NEON_CYBERPUNK' | 'CINEMATIC_GOLDEN_HOUR' | 'VINTAGE_NOIR' | 'WARM_PASTEL';
  estimatedSeconds: number;
}

export interface CharacterItem {
  id?: string;
  name: string;
  role: string;
  ageGroup: string;
  genderPresentation: string;
  personality: string;
  appearance: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
}

export interface CharacterVisualItem {
  id?: string;
  characterId: string;
  seed: number;
  faceEmbedding?: string;
  turnaroundPrompt: string;
  avatarUrl?: string;
  clothingStyle: string;
  consistencyScore: number;
}

export interface StylePresetItem {
  id?: string;
  name: string;
  category: string;
  promptModifier: string;
  negativePrompt?: string;
  paletteTags: string[];
  coherenceScore: number;
}

export interface EnvironmentRefItem {
  id?: string;
  locationName: string;
  stylePresetName: string;
  environmentPrompt: string;
  coherenceScore: number;
}

export interface KeyframeImageItem {
  id?: string;
  sceneId: string;
  prompt: string;
  imageUrl: string;
  provider: string;
  width: number;
  height: number;
  seed: number;
  isUpscaled: boolean;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface ImageGenerationJob {
  jobId: string;
  sceneIds: string[];
  totalImages: number;
  completedImages: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  images: KeyframeImageItem[];
}

export interface VoiceSynthesisItem {
  id?: string;
  text: string;
  voiceId: string;
  provider: string;
  audioUrl: string;
  durationSeconds: number;
  emotion: string;
  speed: number;
  pitch: number;
}

export interface VoiceCatalogItem {
  voiceId: string;
  name: string;
  gender: 'FEMALE' | 'MALE' | 'NEUTRAL';
  ageGroup: 'CHILD' | 'YOUNG_ADULT' | 'ADULT' | 'ELDERLY';
  language: string;
  accent: string;
  sampleUrl: string;
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
