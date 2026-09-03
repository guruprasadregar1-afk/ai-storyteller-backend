import fs from 'fs';
import path from 'path';
import { ITTSProvider, TTSOptions, TTSResult } from './ITTSProvider';
import { TTSProviderCapabilities } from '../../types';
import { getLanguageConfig } from '../../config/language.config';

export class DefaultTTSProvider implements ITTSProvider {
  name = 'default-tts';
  private audioOutputDir: string;

  constructor() {
    this.audioOutputDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(this.audioOutputDir)) {
      try {
        fs.mkdirSync(this.audioOutputDir, { recursive: true });
      } catch {
        // Ignore directory creation error
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities(): TTSProviderCapabilities {
    return {
      languages: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'bn', 'mr', 'te', 'ta', 'ur'],
      voices: ['default-voice-narrator'],
      supportsEmotion: false,
      supportsProsody: false,
      supportsPitch: false,
      supportsRate: false,
      supportsVolume: false,
      supportsSSML: false
    };
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    // Remove parenthetical annotations before TTS audio generation
    const cleanText = options.text.replace(/\([^)]*\)/g, '').trim();
    if (!cleanText) {
      throw new Error('DEFAULT_TTS_EMPTY_TEXT: Cannot synthesize empty story text.');
    }

    const langConfig = getLanguageConfig(options.language || 'en');
    const targetLang = langConfig.code;

    console.log(`[DefaultTTSProvider] Synthesizing full narration audio for ${cleanText.split(/\s+/).length} words in language '${langConfig.name}' (${targetLang})...`);

    // 1. Split text into ~120 character chunks for reliable TTS fetching
    const chunks = this.splitTextIntoChunks(cleanText, 120);

    // 2. Fetch raw MP3 audio buffers in parallel batches of 5
    const batchSize = 5;
    const chunkResults: (Buffer | null)[] = new Array(chunks.length).fill(null);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchIndices = Array.from({ length: Math.min(batchSize, chunks.length - i) }, (_, idx) => i + idx);
      await Promise.all(
        batchIndices.map(async (idx) => {
          const chunk = chunks[idx];
          if (!chunk || !chunk.trim()) return;

          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=${targetLang}&client=tw-ob`;
          try {
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            if (response.ok) {
              const arrayBuf = await response.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              if (buf.length > 50) {
                chunkResults[idx] = buf;
              }
            }
          } catch {
            // Ignore single chunk fetch error
          }
        })
      );
    }

    const audioBuffers = chunkResults.filter((b): b is Buffer => Boolean(b));

    if (audioBuffers.length === 0) {
      throw new Error('DEFAULT_TTS_FAILED: Unable to fetch valid audio bytes for narration.');
    }

    // 3. Concatenate all chunk audio buffers into master MP3
    const masterAudioBuffer = Buffer.concat(audioBuffers);

    if (masterAudioBuffer.length < 1024) {
      throw new Error(`DEFAULT_TTS_TOO_SMALL: Generated MP3 buffer is too small (${masterAudioBuffer.length} bytes).`);
    }

    // 4. Save master MP3 file to public/audio directory
    const fileName = `default-tts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.mp3`;
    const filePath = path.join(this.audioOutputDir, fileName);
    fs.writeFileSync(filePath, masterAudioBuffer);

    console.log(`[DefaultTTSProvider] Successfully generated real audio file '${fileName}' (${masterAudioBuffer.length} bytes).`);

    const wordCount = cleanText.split(/\s+/).length;
    const actualDuration = Math.max(3, Math.round((wordCount / 2.3) * 10) / 10);
    const host = process.env.BACKEND_HOST || 'http://localhost:3005';
    const audioUrl = `${host}/audio/${fileName}`;

    return {
      provider: this.name,
      voiceId: 'default-narrator-voice',
      voiceName: `Default Narration (${langConfig.name})`,
      language: langConfig.name,
      locale: langConfig.locale,
      audioUrl,
      duration: actualDuration,
      format: 'mp3',
      storagePath: `public/audio/${fileName}`,
      status: 'READY',
      emotionAware: false
    };
  }

  private splitTextIntoChunks(text: string, maxLen: number): string[] {
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length > maxLen) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        if (sentence.length > maxLen) {
          const words = sentence.split(/\s+/);
          let subChunk = '';
          for (const word of words) {
            if ((subChunk + ' ' + word).length > maxLen) {
              if (subChunk.trim()) chunks.push(subChunk.trim());
              subChunk = word;
            } else {
              subChunk += ' ' + word;
            }
          }
          if (subChunk.trim()) currentChunk = subChunk;
          else currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
