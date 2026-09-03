/** Default test env: keyword fallback unless integration tests opt in. */
process.env.EMOTION_ENGINE_ENABLED = process.env.EMOTION_ENGINE_ENABLED ?? 'false';
