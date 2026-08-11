import { SubtitleItem, SubtitleCueItem } from '../types';

export class SubtitleService {
  private subtitlesStore: Map<string, SubtitleItem> = new Map();

  async generateSubtitles(
    scriptId: string,
    narrationBeats: Array<{ text: string; startTime: number; duration: number; speaker?: string }>,
    language = 'English'
  ): Promise<SubtitleItem> {
    console.log(`[SubtitleService] Generating ${language} subtitles for script '${scriptId}' (${narrationBeats.length} cues)`);

    const cues: SubtitleCueItem[] = narrationBeats.map(b => ({
      startTimeSeconds: b.startTime,
      endTimeSeconds: Math.round((b.startTime + b.duration) * 10) / 10,
      text: b.text,
      speaker: b.speaker
    }));

    const key = `${scriptId}:${language.toLowerCase()}`;
    const subtitle: SubtitleItem = {
      id: `sub-${Date.now()}`,
      scriptId,
      language,
      cues,
      srtExportUrl: `/api/subtitles/export/${scriptId}?format=srt&lang=${language}`,
      vttExportUrl: `/api/subtitles/export/${scriptId}?format=vtt&lang=${language}`
    };

    this.subtitlesStore.set(key, subtitle);
    return subtitle;
  }

  async translateSubtitles(
    scriptId: string,
    targetLanguage: string
  ): Promise<SubtitleItem | null> {
    console.log(`[SubtitleService] Translating subtitles for script '${scriptId}' to '${targetLanguage}'`);

    const sourceKey = `${scriptId}:english`;
    const source = this.subtitlesStore.get(sourceKey);
    if (!source) {
      return null;
    }

    const translatedCues: SubtitleCueItem[] = source.cues.map(cue => ({
      ...cue,
      text: `[${targetLanguage.toUpperCase()}] ${cue.text}`
    }));

    return this.generateSubtitles(
      scriptId,
      translatedCues.map(c => ({
        text: c.text,
        startTime: c.startTimeSeconds,
        duration: c.endTimeSeconds - c.startTimeSeconds,
        speaker: c.speaker
      })),
      targetLanguage
    );
  }

  generateSRT(cues: SubtitleCueItem[]): string {
    return cues.map((cue, index) => {
      const startStr = this.formatSRTTimestamp(cue.startTimeSeconds);
      const endStr = this.formatSRTTimestamp(cue.endTimeSeconds);
      const text = cue.speaker ? `${cue.speaker.toUpperCase()}: ${cue.text}` : cue.text;
      return `${index + 1}\n${startStr} --> ${endStr}\n${text}\n`;
    }).join('\n');
  }

  generateVTT(cues: SubtitleCueItem[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues.map((cue, index) => {
      const startStr = this.formatVTTTimestamp(cue.startTimeSeconds);
      const endStr = this.formatVTTTimestamp(cue.endTimeSeconds);
      const text = cue.speaker ? `<v ${cue.speaker}>${cue.text}</v>` : cue.text;
      return `${index + 1}\n${startStr} --> ${endStr}\n${text}\n`;
    }).join('\n');
    return header + body;
  }

  getSubtitles(scriptId: string, language = 'English'): SubtitleItem | null {
    const key = `${scriptId}:${language.toLowerCase()}`;
    return this.subtitlesStore.get(key) || null;
  }

  private formatSRTTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
  }

  private formatVTTTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
  }
}
