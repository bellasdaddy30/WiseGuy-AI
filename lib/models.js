// Model IDs must match what each provider currently serves.
// Run `npm run check-keys` to confirm every ID below exists for your keys.
export const MODELS = [
  // Groq — free tier, no card required
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    description: 'Meta\'s Llama via Groq. Very fast, strong general performance.',
    cost: 'Free',
    default: true,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'groq',
    description: 'OpenAI\'s open-weight model on Groq. Good reasoning.',
    cost: 'Free',
    default: false,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    description: 'Tiny and blazing fast. Highest free daily limit.',
    cost: 'Free',
    default: false,
  },

  // Google — free tier via AI Studio key
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Google\'s fast model. Quick and capable.',
    cost: 'Free',
    default: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'google',
    description: 'Newer Google Flash model.',
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
