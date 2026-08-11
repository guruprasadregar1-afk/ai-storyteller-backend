export const aiConfig = {
  defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  runwayApiKey: process.env.RUNWAY_API_KEY || ''
};
