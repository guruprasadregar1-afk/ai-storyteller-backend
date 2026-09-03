/**
 * Benchmark cloud API paragraph translation with rate-limit-safe concurrency.
 *
 * Usage: npx ts-node -r dotenv/config scripts/benchmark_cloud_translation.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { AIProviderManager } from '../src/ai/AIProviderManager';
import { translationCloudConcurrency } from '../src/ai/aiModelConfig';
import { mapWithConcurrency } from '../src/common/utils/parallelPool';

const TELL_TALE_REGEX =
  /lowerTitle\.includes\('tell-tale heart'\)[\s\S]*?fullScript = `([\s\S]*?)`;\s+\} else \{/;

function loadTellTaleHeart(): string {
  const claudePath = path.join(__dirname, '../src/ai/ClaudeProvider.ts');
  const src = fs.readFileSync(claudePath, 'utf8');
  const m = src.match(TELL_TALE_REGEX);
  if (!m) throw new Error('Tell-Tale Heart script not found in ClaudeProvider.ts');
  return m[1];
}

async function main(): Promise<void> {
  const story = loadTellTaleHeart();
  const paragraphs = story.split(/\n\s*\n/).filter((p) => p.trim());
  const concurrency = translationCloudConcurrency();
  const ai = new AIProviderManager();

  console.log(`Paragraphs: ${paragraphs.length}, cloud concurrency: ${concurrency}`);
  const wallStart = Date.now();

  await mapWithConcurrency(paragraphs, concurrency, async (pText, index) => {
    const start = Date.now();
    await ai.translateText(pText.trim(), 'hi', 'Hindi');
    console.log(`  para ${index + 1}/${paragraphs.length} in ${Date.now() - start}ms`);
    return pText;
  });

  const wallMs = Date.now() - wallStart;
  console.log(`\nTotal wall time: ${(wallMs / 1000).toFixed(1)}s (${(wallMs / 60000).toFixed(2)} min)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
