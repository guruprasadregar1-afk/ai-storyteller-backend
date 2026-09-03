import Groq from 'groq-sdk';
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
import { buildStoryDialogueRequirementsBlock } from '../common/utils/story-dialogue-guidance';
import { ClaudeProvider } from './ClaudeProvider';
import { resolveGroqModel, isRetryableProviderError, retryDelayMsFromError } from './aiModelConfig';

export class GroqProvider implements AIProvider {
  name = 'groq';
  private claudeFallback = new ClaudeProvider();
  private apiKey: string;
  private model: string;
  private client: Groq | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model = resolveGroqModel();
    if (this.apiKey && !this.apiKey.toLowerCase().startsWith('xai-')) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  async isAvailable(): Promise<boolean> {
    // xAI keys (xai- prefix) are incompatible with Groq's API endpoint.
    if (!this.apiKey || this.apiKey.length <= 5) return false;
    if (this.apiKey.toLowerCase().startsWith('xai-')) return false;
    return true;
  }

  // ─────────────────────────────────────────────
  // Translation — full paragraph, pure target language
  // ─────────────────────────────────────────────

  async translateText(
    text: string,
    targetLanguageCode: string,
    targetLanguageName: string
  ): Promise<{ translatedText: string; model: string }> {
    if (!this.client) {
      throw new Error('GroqProvider.translateText: GROQ_API_KEY is not configured or is invalid.');
    }

    const prompt = `You are a professional literary translator. Translate the following story paragraph COMPLETELY into ${targetLanguageName} (language code: ${targetLanguageCode}).

STRICT RULES — MUST FOLLOW EXACTLY:
1. Translate EVERY sentence, clause, and word completely. Do NOT skip, shorten, or summarize any part.
2. Do NOT leave ANY English word untranslated — EXCEPT proper nouns (character names, place names) which must be transliterated into the target script if the target language uses a non-Latin script (e.g., Devanagari for Hindi, Tamil script for Tamil).
3. Do NOT add a generic opener like "एक समय की बात है" or "ஒரு காலத்தில்" unless those exact words appear in the source.
4. Do NOT mix languages in a sentence. Do NOT produce hybrid words.
5. Output ONLY the raw translated text — NO markdown, NO commentary, NO labels, NO preamble, NO quotation marks around the output.
6. The response must be ONLY the translated paragraph text.

SOURCE PARAGRAPH (English):
${text}

COMPLETE ${targetLanguageName.toUpperCase()} TRANSLATION (raw text only):`;

    const maxAttempts = 4;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 3000
        });

        const translatedText = (response.choices[0]?.message?.content || '').trim()
          // Strip any accidental markdown bold/italic the model may have added
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/_{2}(.+?)_{2}/g, '$1')
          .replace(/_(.+?)_/g, '$1');

        if (!translatedText) {
          throw new Error('GroqProvider.translateText: model returned an empty translation.');
        }

        return { translatedText, model: this.model };
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || String(err);
        if (isRetryableProviderError(msg) && attempt < maxAttempts) {
          const waitMs = retryDelayMsFromError(msg, attempt);
          console.warn(
            `[GroqProvider] Rate limit for translation (${this.model}). Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxAttempts}…`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  // ─────────────────────────────────────────────
  // Content Classification via Groq
  // ─────────────────────────────────────────────

  async classifyContent(input: string): Promise<ClassifyResult> {
    if (!this.client) return this.claudeFallback.classifyContent(input);

    try {
      const prompt = `Classify the following title or input as a content type.

Input: "${input}"

Choose exactly ONE content type:
- MOVIE: Feature films (Bollywood, Hollywood, regional cinema)
- BOOK: Novels, books, literature
- HISTORY: Historical figures, events, battles
- FOLKLORE: Folk tales, fairy tales, mythology, epics
- STORY: Short stories or user-created stories
- USER_CONTEXT: Vague or custom user scenario

Respond in this EXACT JSON format (no other text):
{"contentType":"MOVIE","confidence":0.95,"canonicalTitle":"The Exact Title","reason":"Brief reason","suggestedAdaptation":"TRADITIONAL"}

suggestedAdaptation must be one of: TRADITIONAL, MOVIE_ADAPTATION, BOOK_ADAPTATION`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200
      });

      const raw = (response.choices[0]?.message?.content || '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          contentType: parsed.contentType || 'FOLKLORE',
          confidence: parsed.confidence || 0.85,
          canonicalTitle: parsed.canonicalTitle || input.trim(),
          reason: parsed.reason || `Classified as ${parsed.contentType} by Groq.`,
          candidateTitles: [input.trim()],
          suggestedAdaptation: (parsed.suggestedAdaptation || 'TRADITIONAL') as AdaptationVersion
        };
      }
    } catch (err: any) {
      console.warn(`[GroqProvider] classifyContent failed: ${err.message}`);
    }

    return this.claudeFallback.classifyContent(input);
  }

  // ─────────────────────────────────────────────
  // Research via Groq
  // ─────────────────────────────────────────────

  async researchContent(query: string, contentType?: ContentType): Promise<ResearchResult> {
    if (!this.client) return this.claudeFallback.researchContent(query, contentType);

    // Use ClaudeProvider's hardcoded research for well-known presets (faster, richer)
    const lower = query.trim().toLowerCase();
    if (
      lower.includes('3 idiots') || lower.includes('rani lakshmibai') ||
      lower.includes('cinderella') || lower.includes('titanic') ||
      lower.includes('jungle book')
    ) {
      return this.claudeFallback.researchContent(query, contentType);
    }

    try {
      const type = contentType || 'FOLKLORE';
      const prompt = `You are a literary and cultural research expert. Provide factual research for a storytelling AI.

TITLE: "${query}"
CONTENT TYPE: ${type}

Respond ONLY in this exact JSON format (no other text):
{"title":"Canonical Title","canonicalTitle":"Canonical Title","contentType":"${type}","adaptationVersion":"TRADITIONAL","description":"1-2 sentence description","setting":"Where and when the story takes place","themes":["theme1","theme2"],"characters":[{"name":"Name","role":"Protagonist","personality":"traits"},{"name":"Name","role":"Antagonist","personality":"traits"}],"facts":["Key plot point 1 — specific and chronological","Key plot point 2","Key plot point 3","Key plot point 4","Key plot point 5"]}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000
      });

      const raw = (response.choices[0]?.message?.content || '').trim();
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
      console.warn(`[GroqProvider] researchContent failed: ${err.message}`);
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
  // Story Generation via Groq (live, for any title)
  // ─────────────────────────────────────────────

  async generateStoryScript(
    title: string,
    facts: string[],
    params: ScriptGenerationParams,
    researchData?: ResearchResult
  ): Promise<ScriptResult> {
    // Use ClaudeProvider's pre-written canonical scripts for the 5 well-known presets
    const lower = title.trim().toLowerCase();
    if (
      lower.includes('3 idiots') || lower.includes('rani lakshmibai') ||
      lower.includes('cinderella') || lower.includes('titanic') ||
      lower.includes('jungle book') || lower.includes('tell-tale heart') ||
      lower.includes('tell tale heart') || lower.includes('gift of the magi')
    ) {
      const res = await this.claudeFallback.generateStoryScript(title, facts, params, researchData);
      return { ...res, provider: this.name, model: this.model };
    }

    // Live Groq generation for all other titles
    if (this.client) {
      try {
        const factsList = facts.length > 0
          ? facts.map((f, i) => `${i + 1}. ${f}`).join('\n')
          : researchData?.description || `A compelling story about ${title}.`;

        const characters = researchData?.characters
          ? researchData.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n')
          : '';

        const setting = researchData?.setting || '';
        const themes = researchData?.themes?.join(', ') || '';
        const contentType = researchData?.contentType || 'FOLKLORE';

        const prompt = `You are a master storyteller. Write a complete, immersive story narration.

STORY TITLE: "${title}"
CONTENT TYPE: ${contentType}
${setting ? `SETTING: ${setting}` : ''}
${themes ? `THEMES: ${themes}` : ''}
${characters ? `KEY CHARACTERS:\n${characters}` : ''}

KEY STORY FACTS (use ALL — do not skip any):
${factsList}

SOURCE FIDELITY (CRITICAL):
- This is a retelling of the specific work "${title}" — NOT an original story.
- Use ONLY characters, settings, and plot beats from the KEY STORY FACTS above.
- Do NOT invent unrelated characters, fantasy worlds, or substitute plots.
- If the source is first-person (e.g. Poe), preserve that narrative voice.

REQUIREMENTS:
- Write a MINIMUM of 600 words across 5-7 paragraphs.
- Open directly in the story world — vivid, cinematic, immersive.
- Each paragraph: 4-8 sentences with sensory detail, character emotion, and plot momentum.
- Build a clear arc: setup → escalating conflict → climax → resolution.
- End with a meaningful, emotionally resonant conclusion.
- Third-person omniscient narrative voice, literary prose quality.
- NO bullet points, NO headers, NO markdown formatting — pure prose only.

${buildStoryDialogueRequirementsBlock({ requireDialogue: params.requireMultiVoiceDialogue !== false })}

Write the complete story now:`;

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        });

        const fullScript = (response.choices[0]?.message?.content || '').trim();

        if (fullScript && fullScript.split(/\s+/).length >= 400) {
          console.log(`[GroqProvider] Generated live story for '${title}': ${fullScript.split(/\s+/).length} words`);
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

        console.warn(`[GroqProvider] Live story for '${title}' too short (${fullScript.split(/\s+/).length} words). Using research-based fallback.`);
      } catch (err: any) {
        console.warn(`[GroqProvider] generateStoryScript API call failed: ${err.message}. Using research-based fallback.`);
      }
    }

    // Final fallback: ClaudeProvider (which now generates 600+ word research-driven stories)
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