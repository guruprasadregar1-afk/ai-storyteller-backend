import { VoiceSynthesisItem, VoiceCatalogItem } from '../types';

export class VoiceService {
  private catalog: Map<string, VoiceCatalogItem> = new Map();

  constructor() {
    this.seedCatalog();
  }

  getVoiceCatalog(): VoiceCatalogItem[] {
    return Array.from(this.catalog.values());
  }

  getVoiceById(voiceId: string): VoiceCatalogItem | undefined {
    return this.catalog.get(voiceId.toLowerCase());
  }

  async synthesizeSpeech(
    text: string,
    voiceId = 'eleven-rachel',
    provider = 'elevenlabs',
    emotion = 'Neutral',
    speed = 1.0,
    pitch = 1.0
  ): Promise<VoiceSynthesisItem> {
    console.log(`[VoiceService] Synthesizing speech for text: "${text.substring(0, 30)}..." using voice '${voiceId}'`);

    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const baseDuration = Math.max(1.5, Math.round((words / 2.5) * 10) / 10);
    const durationSeconds = Math.round((baseDuration / speed) * 10) / 10;

    return {
      id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      voiceId,
      provider,
      audioUrl: `https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg`,
      durationSeconds,
      emotion,
      speed,
      pitch
    };
  }

  async synthesizeMultiSpeakerDialogue(
    lines: Array<{ speaker: string; voiceId?: string; text: string }>
  ): Promise<{ dialogueAudio: VoiceSynthesisItem[]; totalDurationSeconds: number }> {
    console.log(`[VoiceService] Synthesizing multi-speaker dialogue (${lines.length} turns)`);

    const dialogueAudio: VoiceSynthesisItem[] = [];
    let totalDurationSeconds = 0;

    for (const line of lines) {
      const assignedVoice = line.voiceId || this.resolveVoiceForSpeaker(line.speaker);
      const audio = await this.synthesizeSpeech(line.text, assignedVoice);
      dialogueAudio.push(audio);
      totalDurationSeconds += audio.durationSeconds;
    }

    return {
      dialogueAudio,
      totalDurationSeconds: Math.round(totalDurationSeconds * 10) / 10
    };
  }

  resolveVoiceForSpeaker(speakerName: string): string {
    const lower = speakerName.toLowerCase();
    if (lower.includes('female') || lower.includes('girl') || lower.includes('heroine')) {
      return 'eleven-rachel';
    }
    if (lower.includes('male') || lower.includes('hero') || lower.includes('captain')) {
      return 'eleven-adam';
    }
    if (lower.includes('mentor') || lower.includes('old') || lower.includes('king')) {
      return 'eleven-antoni';
    }
    return 'eleven-rachel';
  }

  private seedCatalog() {
    const defaultVoices: VoiceCatalogItem[] = [
      {
        voiceId: 'eleven-rachel',
        name: 'Rachel (Calm & Cinematic)',
        gender: 'FEMALE',
        ageGroup: 'YOUNG_ADULT',
        language: 'English',
        accent: 'American Neutral',
        sampleUrl: 'https://actions.google.com/sounds/v1/speech/sample.ogg'
      },
      {
        voiceId: 'eleven-adam',
        name: 'Adam (Deep & Narrative)',
        gender: 'MALE',
        ageGroup: 'ADULT',
        language: 'English',
        accent: 'American Deep',
        sampleUrl: 'https://actions.google.com/sounds/v1/speech/sample.ogg'
      },
      {
        voiceId: 'eleven-antoni',
        name: 'Antoni (Wise & Expressive)',
        gender: 'MALE',
        ageGroup: 'ELDERLY',
        language: 'English',
        accent: 'British Warm',
        sampleUrl: 'https://actions.google.com/sounds/v1/speech/sample.ogg'
      },
      {
        voiceId: 'eleven-elli',
        name: 'Elli (Playful & Energetic)',
        gender: 'FEMALE',
        ageGroup: 'CHILD',
        language: 'English',
        accent: 'American Child',
        sampleUrl: 'https://actions.google.com/sounds/v1/speech/sample.ogg'
      }
    ];

    for (const v of defaultVoices) {
      this.catalog.set(v.voiceId.toLowerCase(), v);
    }
  }
}
