/**
 * Smoke test: Gemini 3.6 Flash Hindi translation (drop-in API check).
 * Usage: npx ts-node scripts/test_gemini_hindi.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

import { GeminiProvider } from '../src/ai/GeminiProvider';
import { resolveGeminiModel } from '../src/ai/aiModelConfig';

async function main() {
  const model = resolveGeminiModel();
  console.log('GEMINI_MODEL:', model);

  const provider = new GeminiProvider();
  if (!(await provider.isAvailable())) {
    throw new Error('Gemini not available — check GEMINI_API_KEY');
  }

  const paragraph =
    'True! — nervous — very, very dreadfully nervous I had been and am; but why will you say that I am mad?';

  const start = Date.now();
  const result = await provider.translateText(paragraph, 'hi', 'Hindi');
  const ms = Date.now() - start;

  console.log(`OK in ${ms}ms via model ${result.model}`);
  console.log('Translation sample:', result.translatedText.slice(0, 200));
  if (!result.translatedText || result.translatedText.length < 20) {
    throw new Error('Translation too short — likely failed');
  }
  if (/^[A-Za-z\s.,!?—-]+$/.test(result.translatedText.slice(0, 80))) {
    console.warn('Warning: output may still be mostly English in opening');
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
