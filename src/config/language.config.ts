import { StoryLanguage } from '../types';

const EMOTION_ENGINE_PROVIDER = ['emotion-engine'] as const;

export const SUPPORTED_LANGUAGES: StoryLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-US', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', locale: 'hi-IN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'es', name: 'Spanish', nativeName: 'Español', locale: 'es-ES', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'fr', name: 'French', nativeName: 'Français', locale: 'fr-FR', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', locale: 'de-DE', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', locale: 'pt-BR', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', locale: 'it-IT', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', locale: 'ja-JP', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'ko', name: 'Korean', nativeName: '한국어', locale: 'ko-KR', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'zh', name: 'Chinese', nativeName: '中文', locale: 'zh-CN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', locale: 'ar-SA', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', locale: 'bn-IN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', locale: 'mr-IN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', locale: 'te-IN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', locale: 'ta-IN', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', locale: 'ur-PK', isSupported: true, supportedTTSProviders: [...EMOTION_ENGINE_PROVIDER] },
];

export function getLanguageConfig(code: string): StoryLanguage {
  const normalized = code.toLowerCase().trim();

  const byCode = SUPPORTED_LANGUAGES.find(l => l.code === normalized);
  if (byCode) return byCode;

  const byLocale = SUPPORTED_LANGUAGES.find(l => l.locale.toLowerCase().startsWith(normalized));
  if (byLocale) return byLocale;

  const byName = SUPPORTED_LANGUAGES.find(l => l.name.toLowerCase() === normalized);
  if (byName) return byName;

  const byNative = SUPPORTED_LANGUAGES.find(l => l.nativeName.toLowerCase() === normalized);
  if (byNative) return byNative;

  return SUPPORTED_LANGUAGES[0];
}
