# AI Storyteller — Master Product Specification & Memory Rules

## 1. Overview & Core Philosophy
AI Storyteller is a **Content-to-Storytelling Engine** rather than a simple story generator.
User inputs can be:
- Movie titles (e.g., `Titanic`, `3 Idiots`)
- Book titles (e.g., `The Jungle Book`)
- Historical / Biographical topics (e.g., `Rani Lakshmibai`)
- Folklore / Mythology (e.g., `Krishna childhood story`)
- Free-form user context (e.g., `A childhood story about a brave girl`)

The system detects input types, resolves canonical entities, checks existing database knowledge first, performs web research if required, enforces rights policies (avoiding protected screenplay copy), generates original storytelling scripts, extracts character bibles, and generates multi-signal narrator `VoiceProfile` recommendations.

---

## 2. Fundamental Architecture Boundaries
- **Source Knowledge** (`content_sources`, `content_aliases`, `content_references`): Factual/canonical entity data.
- **Generated Script** (`storytelling_scripts`): Original retellings built from source knowledge.
- **Character Identity** (`characters`): Attribute-rich character bibles.
- **Narrator Identity** (`narrator_profiles`): VoiceProfile recommendations based on 10 narrative signals.
- **AI Engine** (`AIProviderManager`): Claude (Anthropic), Gemini (Google), Groq adapter fallback pipeline.

---

## 3. Database Schema Blueprint (Prisma + Supabase PostgreSQL)
Models:
1. `ContentSource`: Canonical title, normalized title, content type, rights status, verification status, content hash, embedding.
2. `ContentAlias`: Alternate titles, translations, common misspellings.
3. `ContentReference`: Factual source URLs, titles, publisher, evidence, rights evidence.
4. `StorytellingScript`: Generated script, mode, language, model, provider, prompt version, rights mode, quality score.
5. `Character`: Name, role, age group, gender presentation, personality, appearance, importance, confidence.
6. `NarratorProfile`: Voice age group, gender presentation, tone, emotion, pace, language, accent, style, audience, reasoning, confidence, provider/model metadata.
7. `AIJob`: Async job tracking, provider, model, latency, status, error.

---

## 4. Multi-LLM Provider Strategy
- **Interface**: `AIProvider` defining capabilities (`classifyContent`, `resolveContent`, `analyzeContent`, `generateStoryScript`, `extractCharacters`, `selectNarrator`, `qualityCheck`).
- **Implementations**:
  - `ClaudeProvider` (Anthropic Claude 3.5 Sonnet / Opus) - Primary for deep reasoning & script planning.
  - `GeminiProvider` (Google Gemini 1.5 Pro / Flash) - Primary for multimodal & broad reasoning fallback.
  - `GroqProvider` (Groq Llama-3 70B/8B) - Primary for high-speed classification & fallback.
- **Fallback Chain**: Claude -> Gemini -> Groq (or configured preferred provider).
- **Rule**: Never expose provider API keys to client code. Always record provider/model used in `AIJob`.

---

## 5. Backend REST API Contract
- `POST /api/content/analyze` - Detect type & resolve canonical entity.
- `GET /api/content/search?q=` - Search stored content database.
- `GET /api/content/:id` - Fetch content entity & references.
- `POST /api/content/:id/research` - Research/refresh external sources.
- `POST /api/content/:id/script` - Generate original storytelling script.
- `GET /api/content/:id/characters` - Extract/fetch character bible.
- `GET /api/content/:id/narrator` - Generate/fetch narrator profile.
- `GET /api/ai/providers/health` - Check health & status of AI providers.
