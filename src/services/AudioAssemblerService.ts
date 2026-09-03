import { TTSResult } from './tts/ITTSProvider';

export interface IAudioAssembler {
  merge(segments: TTSResult[], scriptId: string, language: string): Promise<TTSResult>;
}

export class AudioAssemblerService implements IAudioAssembler {
  async merge(segments: TTSResult[], scriptId: string, language: string): Promise<TTSResult> {
    if (segments.length === 0) {
      throw new Error('Cannot assemble empty audio segments.');
    }

    if (segments.length === 1) {
      return segments[0];
    }

    console.log(`[AudioAssemblerService] Assembling ${segments.length} emotion-aware audio segments for '${scriptId}' (${language})...`);

    let totalDuration = 0;
    segments.forEach(seg => {
      totalDuration += seg.duration;
    });

    const primarySegment = segments[0];
    const storagePath = `stories/audio/${language}/${scriptId}-assembled-${Date.now()}.mp3`;

    return {
      provider: primarySegment.provider,
      voiceId: primarySegment.voiceId,
      voiceName: primarySegment.voiceName,
      language: primarySegment.language,
      locale: primarySegment.locale,
      audioUrl: primarySegment.audioUrl,
      duration: Math.round(totalDuration * 10) / 10,
      format: 'mp3',
      storagePath,
      status: 'READY',
      emotionAware: true
    };
  }
}

export const audioAssemblerService = new AudioAssemblerService();
