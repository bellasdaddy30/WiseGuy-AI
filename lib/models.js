// Model IDs must match what each provider currently serves.
// Run `npm run check-keys` to confirm every ID below exists for your keys.
export const MODELS = [
  // Groq — free tier, no card required
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    provider: 'groq',
    description: 'Alibaba\'s Qwen via Groq. Strong reasoning, less filtered than most.',
    cost: 'Free',
    default: true,
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
    default: false,
  },

  // Google — free tier via AI Studio key
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'google',
    description: 'Google\'s newest Flash model. Fast and capable.',
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

  // OpenAI — paid only, needs OPENAI_API_KEY with credits
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and cheap. Requires paid OpenAI credits.',
    cost: '$',
    default: false,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Stronger reasoning. Requires paid OpenAI credits.',
    cost: '$$',
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
