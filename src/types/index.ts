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

export interface AudioTrackItem {
  id?: string;
  title: string;
  trackType: 'MUSIC' | 'SFX' | 'AMBIENT';
  genreOrMood: string;
  audioUrl: string;
  durationSeconds: number;
  duckingDb: number;
}

export interface AudioMixConfig {
  narrationTrackUrl: string;
  musicTrackUrl: string;
  sfxTrackUrls?: string[];
  duckingLevelDb: number;
  outputMixedUrl: string;
  totalDurationSeconds: number;
}

export interface VideoMotionItem {
  id?: string;
  sceneId: string;
  sourceImageUrl: string;
  videoUrl: string;
  motionType: 'PAN_LEFT' | 'PAN_RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT' | 'ORBIT' | 'TILT_UP';
  motionStrength: number;
  provider: string;
  durationSeconds: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface VideoJobStatus {
  jobId: string;
  sceneId: string;
  motion: VideoMotionItem;
  progressPercent: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface TimelineClipItem {
  id: string;
  clipType: 'VIDEO' | 'AUDIO_NARRATION' | 'AUDIO_MUSIC' | 'AUDIO_SFX' | 'TEXT';
  startTimeSeconds: number;
  durationSeconds: number;
  assetUrl: string;
  label: string;
}

export interface TimelineTrackItem {
  id: string;
  name: string;
  trackType: 'VIDEO' | 'AUDIO' | 'SUBTITLE';
  layerOrder: number;
  clips: TimelineClipItem[];
}

export interface TimelineItem {
  id?: string;
  scriptId: string;
  tracks: TimelineTrackItem[];
  totalDuration: number;
  fps: number;
}

export interface SubtitleCueItem {
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
  speaker?: string;
}

export interface SubtitleItem {
  id?: string;
  scriptId: string;
  language: string;
  cues: SubtitleCueItem[];
  srtExportUrl?: string;
  vttExportUrl?: string;
}

export interface RenderJobItem {
  jobId: string;
  scriptId: string;
  resolution: '720p' | '1080p' | '4K';
  fps: number;
  outputVideoUrl?: string;
  progressPercent: number;
  status: 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  renderTimeMs?: number;
}

export interface QueueJobItem {
  id: string;
  taskName: string;
  payload: Record<string, any>;
  status: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  attempts: number;
  maxAttempts: number;
  webhookUrl?: string;
  lastError?: string;
}

export interface SocialExportItem {
  id?: string;
  scriptId: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  targetPlatform: string;
  width: number;
  height: number;
  exportUrl: string;
  hashtags: string[];
}

export interface PromptTemplateItem {
  id?: string;
  name: string;
  category: string;
  templateText: string;
  negativePrompt?: string;
  tokenEstimate: number;
}

export interface PromptOptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  negativePrompt: string;
  estimatedTokens: number;
  variations: string[];
}

export interface CollabUser {
  userId: string;
  userName: string;
  role: 'EDITOR' | 'VIEWER' | 'ADMIN';
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
}

export interface CollabSessionItem {
  id?: string;
  roomId: string;
  scriptId: string;
  activeUsers: CollabUser[];
  elementLocks: Record<string, string>; // elementId -> userId
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
