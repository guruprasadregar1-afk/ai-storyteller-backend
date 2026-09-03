import { resolveGeminiModel, resolveGroqModel } from '../src/ai/aiModelConfig';

describe('aiModelConfig defaults', () => {
  test('resolveGeminiModel defaults to gemini-3.6-flash', () => {
    const prev = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    expect(resolveGeminiModel()).toBe('gemini-3.6-flash');
    process.env.GEMINI_MODEL = prev;
  });

  test('resolveGroqModel defaults to openai/gpt-oss-120b', () => {
    const prev = process.env.GROQ_MODEL;
    delete process.env.GROQ_MODEL;
    expect(resolveGroqModel()).toBe('openai/gpt-oss-120b');
    process.env.GROQ_MODEL = prev;
  });
});
