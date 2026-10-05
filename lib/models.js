// Model IDs must match what each provider currently serves.
// Run `npm run check-keys` to confirm every ID below exists for your keys.
export const MODEL_KEY = 'wiseguy_model';

export const MODELS = [
  // Groq — free tier, no card required
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    provider: 'groq',
    description: 'Alibaba\'s Qwen via Groq. Strong reasoning, less filtered than most.',
    cost: 'Free',
    default: false,
    maxTokens: 800, // Groq free-tier OTPM cap is 1000; stay under it
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'groq',
    description: 'OpenAI\'s open-weight model on Groq. Best reasoning on free tier.',
    cost: 'Free',
    default: false,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'groq',
    description: 'Smaller open-weight model. Fast with high daily limits.',
    cost: 'Free',
    default: true,
  },

  // Google — free tier via AI Studio key
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'google',
    description: 'Google\'s newest Flash model. Fast — but safety filters block profanity.',
    cost: 'Free',
    default: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'google',
    description: 'Reliable Google Flash model.',
    cost: 'Free',
    default: false,
  },

];

export const DEFAULT_MODEL = MODELS.find(m => m.default).id;

export function isValidModel(id) {
  return MODELS.some(m => m.id === id);
}

export function getModel(id) {
  return MODELS.find(m => m.id === id) ?? MODELS.find(m => m.default);
}
