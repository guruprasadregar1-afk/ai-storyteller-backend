import fs from 'fs';
import path from 'path';

export interface AudioValidationResult {
  isValid: boolean;
  byteSize: number;
  format: string;
  duration: number;
  reason?: string;
}

export class AudioValidationService {
  static validateAudioRecord(audioUrl: string, storagePath?: string, duration = 0): AudioValidationResult {
    // 1. Validate storage file on disk if available
    let targetPath = storagePath;
    if (!targetPath && audioUrl.includes('/audio/')) {
      const fileName = audioUrl.split('/audio/').pop()?.split('?')[0];
      if (fileName) {
        targetPath = path.join(process.cwd(), 'public', 'audio', fileName);
      }
    }

    if (targetPath && fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.size < 1024) {
        return {
          isValid: false,
          byteSize: stat.size,
          format: 'mp3',
          duration,
          reason: `Audio buffer size is too small (${stat.size} bytes). Minimum 1KB required.`
        };
      }

      const buffer = fs.readFileSync(targetPath);
      // Check MP3 frame header: ID3 tag (0x49 0x44 0x33) or Sync Word (0xFF)
      const isMp3Header = (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || buffer[0] === 0xFF;
      if (!isMp3Header) {
        return {
          isValid: false,
          byteSize: stat.size,
          format: 'mp3',
          duration,
          reason: 'File lacks valid MP3 audio frame header.'
        };
      }

      return {
        isValid: true,
        byteSize: stat.size,
        format: 'mp3',
        duration: duration || Math.round((stat.size / 16000) * 10) / 10
      };
    }

    // 2. Validate URL format
    if (!audioUrl || typeof audioUrl !== 'string' || (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://'))) {
      return {
        isValid: false,
        byteSize: 0,
        format: 'unknown',
        duration,
        reason: 'Audio URL is invalid or malformed.'
      };
    }

    return {
      isValid: true,
      byteSize: 50000, // Estimated
      format: 'mp3',
      duration: duration || 5.0
    };
  }
}
