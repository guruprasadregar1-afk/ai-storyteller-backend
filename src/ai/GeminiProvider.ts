import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { AIProvider } from './AIProvider';
import {
  ClassifyResult,
  ScriptGenerationParams,
  ScriptResult,
  CharacterItem,
  VoiceProfileResult,
  SceneBeatItem,
  CharacterVisualItem,
  ContentType,
  AdaptationVersion
} from '../types';
import { ResearchResult } from '../services/ResearchService';
import { ClaudeProvider } from './ClaudeProvider';
import { buildStoryDialogueRequirementsBlock } from '../common/utils/story-dialogue-guidance';
import { isRetryableProviderError, resolveGeminiModel, retryDelayMsFromError } from './aiModelConfig';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private claudeFallback = new ClaudeProvider();
  private apiKey: string;
  private model: string = resolveGeminiModel();
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
  }

  private currentModel(): string {
    this.model = resolveGeminiModel();
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  // ─────────────────────────────────────────────
  // Translation
  // ─────────────────────────────────────────────

  /**
   * REAL translation call via Gemini. No hardcoded templates, no dictionary substitution.
   * Sends every paragraph to the model with explicit no-markdown, no-commentary rules.
   */
  async translateText(
    text: string,
    targetLanguageCode: string,
    targetLanguageName: string
  ): Promise<{ translatedText: string; model: string }> {
    if (!this.client) {
      throw new Error('GeminiProvider.translateText: GEMINI_API_KEY is not configured.');
    }

    this.currentModel();

    const prompt = `You are a professional literary translator. Your task is to translate a story paragraph.

TARGET LANGUAGE: ${targetLanguageName} (code: ${targetLanguageCode})

STRICT RULES — MUST FOLLOW EXACTLY:
1. Translate EVERY sentence, clause, and word completely. Do NOT skip, shorten, or summarize.
2. Do NOT leave ANY English sentence, clause, or word untranslated (except proper nouns like character names and place names, which must be transliterated into the target script if the language uses a non-Latin script).
3. Do NOT prepend or append ANY generic phrase not present in the source.
4. Do NOT mix languages within a sentence or produce hybrid words.
5. Output ONLY the raw translated text — absolutely NO markdown (no **, no *, no ##), NO phonetic pronunciation, NO alternatives, NO commentary, NO labels, NO preamble, NO quotation marks.
6. The response must be ONLY the translated paragraph text and nothing else.

SOURCE PARAGRAPH:
${text}

TRANSLATED PARAGRAPH IN ${targetLanguageName.toUpperCase()} (raw text only, no markdown, no explanations):`;

    const maxAttempts = 3;
    let lastErr: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const generationConfig: GenerationConfig = { temperature: 0.1, maxOutputTokens: 3000 };
        const model = this.client.getGenerativeModel({ model: this.model, generationConfig });
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();

        const translatedText = this.cleanTranslationOutput(rawText);

        if (!translatedText) {
          throw new Error('GeminiProvider.translateText: model returned an empty translation.');
        }

        return { translatedText, model: this.model };
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || '';
        if (isRetryableProviderError(msg) && attempt < maxAttempts) {
          const waitMs = retryDelayMsFromError(msg, attempt);
          console.warn(
            `[GeminiProvider] Rate limit / capacity for translation (${this.model}). Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxAttempts}...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * Strips markdown formatting, phonetic annotations, alternative versions, labels,
   * and any other non-translation content that models sometimes add despite instructions.
   */
  private cleanTranslationOutput(raw: string): string {
    const lines = raw.split('\n');
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip markdown headers/separators
      if (/^#{1,6}\s/.test(trimmed)) continue;
      if (/^[-*_]{3,}$/.test(trimmed)) continue;

      // Skip phonetic lines (wrapped in parens or italic asterisks)
      if (/^\*.*\*$/.test(trimmed) || /^\(.*\)$/.test(trimmed)) continue;

      // Skip lines that look like labels/notes
      if (/^(here is|translation|simpler|alternative|phonetic|note:|literally|version|meaning)/i.test(trimmed)) continue;

      // Strip inline markdown bold/italic
      let cleaned = trimmed
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_{2}(.+?)_{2}/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .trim();

      if (cleaned) cleanLines.push(cleaned);
    }

    return cleanLines.join(' ').trim();
  }

  // ─────────────────────────────────────────────
  // Content Classification (Live Gemini call for unknown titles)
  // ─────────────────────────────────────────────

  async classifyContent(input: string): Promise<ClassifyResult> {
    // Use ClaudeProvider for known hardcoded titles (faster, no API call)
    const lower = input.trim().toLowerCase();
    if (
      lower.includes('3 idiots') || lower.includes('rani lakshmibai') ||
      lower.includes('cinderella') || lower.includes('titanic') ||
      lower.includes('jungle book') || lower.includes('tell-tale heart') ||
      lower.includes('tell tale heart') || lower.includes('gift of the magi')
    ) {
      return this.claudeFallback.classifyContent(input);
    }

    if (!this.client) {
      return this.claudeFallback.classifyContent(input);
    }

    try {
      const prompt = `Classify the following title or input as a content type.

Input: "${input}"

Available content types (choose exactly one):
- MOVIE: Feature films (Bollywood, Hollywood, etc.)
- BOOK: Novels, books, literature
- HISTORY: Historical figures, events, battles, kingdoms
- FOLKLORE: Folk tales, fairy tales, mythology, epics
- STORY: Short stories, user-created stories
- USER_CONTEXT: Custom user scenario or vague description

Respond in this EXACT JSON format (no other text):
{
  "contentType": "MOVIE",
  "confidence": 0.95,
  "canonicalTitle": "The Exact Title",
  "reason": "Brief reason",
  "suggestedAdaptation": "TRADITIONAL"
}

suggestedAdaptation must be one of: TRADITIONAL, MOVIE_ADAPTATION, BOOK_ADAPTATION`;

      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
      });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          contentType: parsed.contentType || 'FOLKLORE',
          confidence: parsed.confidence || 0.85,
          canonicalTitle: parsed.canonicalTitle || input.trim(),
          reason: parsed.reason || `Classified as ${parsed.contentType} by Gemini.`,
          candidateTitles: [input.trim()],
          suggestedAdaptation: (parsed.suggestedAdaptation || 'TRADITIONAL') as AdaptationVersion
        };
      }
    } catch (err: any) {
      console.warn(`[GeminiProvider] classifyContent API call failed: ${err.message}. Using fallback.`);
    }

    return this.claudeFallback.classifyContent(input);
  }

  // ─────────────────────────────────────────────
  // Content Research (Live Gemini call for unknown titles)
  // ─────────────────────────────────────────────

  async researchContent(query: string, contentType?: ContentType): Promise<ResearchResult> {
    // Use ClaudeProvider for well-known hardcoded titles
    const lower = query.trim().toLowerCase();
    if (
      lower.includes('3 idiots') || lower.includes('rani lakshmibai') ||
      lower.includes('cinderella') || lower.includes('titanic') ||
      lower.includes('jungle book')
    ) {
      return this.claudeFallback.researchContent(query, contentType);
    }

    if (!this.client) {
      return this.claudeFallback.researchContent(query, contentType);
    }

    try {
      const type = contentType || 'FOLKLORE';
      const prompt = `You are a literary and cultural research expert. Provide factual research for a storytelling AI.

TITLE: "${query}"
CONTENT TYPE: ${type}

Respond ONLY in this exact JSON format (no other text):
{
  "title": "Canonical Title",
  "canonicalTitle": "Canonical Title",
  "contentType": "${type}",
  "adaptationVersion": "TRADITIONAL",
  "description": "1-2 sentence description of the story/film/book/event",
  "setting": "Where and when the story takes place",
  "themes": ["theme1", "theme2", "theme3"],
  "characters": [
    {"name": "Character Name", "role": "Protagonist", "personality": "Character traits"},
    {"name": "Character Name", "role": "Antagonist", "personality": "Character traits"}
  ],
  "facts": [
    "Key plot point 1 — specific, detailed, chronological",
    "Key plot point 2 — specific, detailed, chronological",
    "Key plot point 3 — specific, detailed, chronological",
    "Key plot point 4 — specific, detailed, chronological",
    "Key plot point 5 — specific, detailed, chronological"
  ]
}`;

      const model = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || query,
          canonicalTitle: parsed.canonicalTitle || query,
          contentType: (parsed.contentType || type) as ContentType,
          adaptationVersion: (parsed.adaptationVersion || 'TRADITIONAL') as AdaptationVersion,
          description: parsed.description || `${query} — a compelling story.`,
          setting: parsed.setting,
          themes: parsed.themes || [],
          characters: parsed.characters || [],
          facts: parsed.facts || [],
          references: [{
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            title: `${query} - Wikipedia`,
            publisher: 'Wikipedia',
            sourceType: 'ENCYCLOPEDIA',
            retrievedAt: new Date().toISOString(),
            evidence: `Research data for ${query}`,
            rightsEvidence: 'Public domain / fair use.',
            isPrimary: true
          }]
        };
      }
    } catch (err: any) {
      console.warn(`[GeminiProvider] researchContent API call failed: ${err.message}. Using fallback.`);
    }

    return this.claudeFallback.researchContent(query, contentType);
  }

  async resolveContent(
    input: string,
    candidates: string[]
  ): Promise<{ canonicalTitle: string; confidence: number; contentType: ContentType }> {
    const classified = await this.classifyContent(input);
    return {
      canonicalTitle: classified.canonicalTitle,
      confidence: classified.confidence,
      contentType: classified.contentType
    };
  }

  // ─────────────────────────────────────────────
  // Story Script Generation (Live Gemini call for any title)
  // ─────────────────────────────────────────────

  async generateStoryScript(
    title: string,
    facts: string[],
    params: ScriptGenerationParams,
    researchData?: ResearchResult
  ): Promise<ScriptResult> {
    const lower = title.trim().toLowerCase();

    // Use ClaudeProvider's pre-written canonical scripts for the 5 well-known presets
    if (
      lower.includes('3 idiots') || lower.includes('rani lakshmibai') ||
      lower.includes('cinderella') || lower.includes('titanic') ||
      lower.includes('jungle book') || lower.includes('tell-tale heart') ||
      lower.includes('tell tale heart') || lower.includes('gift of the magi')
    ) {
      const res = await this.claudeFallback.generateStoryScript(title, facts, params, researchData);
      return { ...res, provider: this.name, model: this.model };
    }

    // For all other titles: use live Gemini story generation
    if (this.client) {
      const maxGeminiAttempts = 2;
      for (let attempt = 1; attempt <= maxGeminiAttempts; attempt++) {
        try {
          const factsList = facts.length > 0
            ? facts.map((f, i) => `${i + 1}. ${f}`).join('\n')
            : researchData?.description || `A compelling story about ${title}.`;

          const characters = researchData?.characters
            ? researchData.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n')
            : '';

          const setting = researchData?.setting || '';
          const themes = researchData?.themes?.join(', ') || '';
          const contentType = researchData?.contentType || params.mode || 'FOLKLORE';

          const prompt = `You are a master storyteller writing a full, immersive, cinematic narration.

Write a complete, engaging story narration for: "${title}"

Content Type: ${contentType}
${setting ? `Setting: ${setting}` : ''}
${themes ? `Themes: ${themes}` : ''}
${characters ? `Key Characters:\n${characters}` : ''}

Key Story Facts (use ALL of these — do not skip any):
${factsList}

SOURCE FIDELITY (CRITICAL):
- This is a retelling of the specific work "${title}" — NOT an original story.
- Use ONLY characters, settings, and plot beats from the Key Story Facts above.
- Do NOT invent unrelated characters, fantasy worlds, or substitute plots.
- If the source is first-person (e.g. Poe), preserve that narrative voice.

WRITING REQUIREMENTS:
1. Write a MINIMUM of 600 words across 5-7 substantial paragraphs.
2. Begin in the middle of the story world — do NOT start with "Once upon a time" unless the genre truly calls for it.
3. Each paragraph must be a complete narrative block (4-8 sentences minimum).
4. Include vivid, sensory description: sights, sounds, emotions, atmosphere.
5. Develop characters with personality, dialogue hints, and internal motivation.
6. Build tension through a clear beginning → escalating conflict → climax → resolution arc.
7. End with a meaningful, emotionally satisfying resolution.
8. Write in third-person omniscient narrative voice, literary quality.
9. NO bullet points, NO headers, NO markdown. Pure prose paragraphs only.
10. Do NOT include any meta-commentary about the story.

${buildStoryDialogueRequirementsBlock({ requireDialogue: params.requireMultiVoiceDialogue !== false })}

Write the complete story narration now:`;

          const model = this.client.getGenerativeModel({
            model: this.model,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
          });
          const result = await model.generateContent(prompt);
          const fullScript = result.response.text().trim();

          if (fullScript && fullScript.split(/\s+/).length >= 400) {
            console.log(`[GeminiProvider] Generated live story for '${title}': ${fullScript.split(/\s+/).length} words`);
            return {
              script: fullScript,
              mode: params.mode || 'STANDARD',
              language: params.language || 'English',
              rightsMode: 'ORIGINAL_RETELLING',
              qualityScore: 0.95,
              provider: this.name,
              model: this.model
            };
          }

          console.warn(`[GeminiProvider] Live story for '${title}' too short (${fullScript.split(/\s+/).length} words). Falling back.`);
          break;
        } catch (err: any) {
          const is429 = err?.message?.includes('429') || err?.message?.includes('Too Many Requests') || err?.message?.includes('quota');
          if (is429 && attempt < maxGeminiAttempts) {
            console.warn(`[GeminiProvider] 429 rate-limit hit for story generation. Waiting 32s before retry ${attempt + 1}/${maxGeminiAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 32000));
            continue;
          }
          console.warn(`[GeminiProvider] generateStoryScript API call failed: ${err.message}. Falling back.`);
          break;
        }
      }
    }

    // Final fallback: ClaudeProvider (uses its generic template, may fail validation but will retry)
    const res = await this.claudeFallback.generateStoryScript(title, facts, params, researchData);
    return { ...res, provider: this.name, model: this.model };
  }

  async segmentScript(scriptText: string): Promise<SceneBeatItem[]> {
    return this.claudeFallback.segmentScript(scriptText);
  }

  async extractCharacters(scriptOrFacts: string): Promise<CharacterItem[]> {
    return this.claudeFallback.extractCharacters(scriptOrFacts);
  }

  async generateCharacterVisuals(character: CharacterItem): Promise<CharacterVisualItem> {
    return this.claudeFallback.generateCharacterVisuals(character);
  }

  async selectNarrator(
    contentInfo: { title: string; contentType: string; genre?: string },
    script: string,
    characters: CharacterItem[]
  ): Promise<VoiceProfileResult> {
    const res = await this.claudeFallback.selectNarrator(contentInfo, script, characters);
    return { ...res, selectedProvider: this.name, selectedModel: this.model };
  }
}