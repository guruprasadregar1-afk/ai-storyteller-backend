export interface ElevenLabsVoiceConfig {
  voiceId: string;
  voiceName: string;
  language: string;
  gender: 'MALE' | 'FEMALE';
  ageProfile: 'CHILD' | 'ADULT' | 'ELDERLY';
  style: string;
}

// Standard pre-made default voices available on all ElevenLabs tiers (Free & Paid)
export const ELEVENLABS_VOICES: ElevenLabsVoiceConfig[] = [
  {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    voiceName: 'Rachel (Warm Female Storyteller)',
    language: 'en',
    gender: 'FEMALE',
    ageProfile: 'ADULT',
    style: 'Fairy Tale Storyteller'
  },
  {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceName: 'Bella (Child-Friendly Expressive)',
    language: 'en',
    gender: 'FEMALE',
    ageProfile: 'ADULT',
    style: 'Child-Friendly Storyteller'
  },
  {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    voiceName: 'Rachel (Mature Reflective Female)',
    language: 'en',
    gender: 'FEMALE',
    ageProfile: 'ELDERLY',
    style: 'Reflective Memoir Storyteller'
  },
  {
    voiceId: 'ErXwobaYiN019PkySvjV',
    voiceName: 'Antoni (Warm Cinematic Male)',
    language: 'en',
    gender: 'MALE',
    ageProfile: 'ADULT',
    style: 'Cinematic Storyteller'
  },
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    voiceName: 'Adam (Weathered Maritime Male)',
    language: 'en',
    gender: 'MALE',
    ageProfile: 'ELDERLY',
    style: 'Cinematic Maritime Storyteller'
  },
  {
    voiceId: 'ErXwobaYiN019PkySvjV',
    voiceName: 'Antoni (Authoritative Warrior King)',
    language: 'en',
    gender: 'MALE',
    ageProfile: 'ELDERLY',
    style: 'Historical Epic Storyteller'
  }
];

export const ELEVENLABS_SUPPORTED_LANGUAGES = [
  'en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'bn', 'mr', 'te', 'ta', 'ur'
];

export function selectElevenLabsVoice(gender: string, ageProfile: string, style: string): ElevenLabsVoiceConfig {
  const match = ELEVENLABS_VOICES.find(v => 
    v.gender === gender.toUpperCase() && 
    (v.ageProfile === ageProfile.toUpperCase() || v.style.toLowerCase().includes(style.toLowerCase()))
  );
  if (match) return match;

  if (gender.toUpperCase() === 'MALE') {
    return ELEVENLABS_VOICES[3]; // Antoni
  }
  return ELEVENLABS_VOICES[0]; // Rachel
}
