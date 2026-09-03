import fs from 'fs';
import path from 'path';

async function testGoogleTTSDownload() {
  console.log('Testing Google TTS MP3 Buffer Download...');

  const text = 'Hello. This is a short audio test for the AI Storyteller default fallback TTS provider.';
  const lang = 'en';
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log(`HTTP Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    console.log(`Downloaded MP3 Buffer Size: ${buffer.length} bytes`);

    // Verify MP3 header (ID3 or 0xFF)
    const isMp3Header = buffer.length > 100 && (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33 || buffer[0] === 0xFF);
    console.log(`Valid MP3 Audio Header: ${isMp3Header}`);

    const outDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const filePath = path.join(outDir, 'test-gtts.mp3');
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved MP3 file to ${filePath}`);
  } catch (err: any) {
    console.error('Download error:', err.message);
  }
}

testGoogleTTSDownload().catch(console.error);
