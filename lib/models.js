export const MODELS = [
  // OpenAI
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and cheap. Handles most conversations well.',
    cost: '$',
    default: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Smarter, better reasoning. Worth it for complex tasks.',
    cost: '$$',
    default: false,
  },
  {
    id: 'gpt-4.5',
    name: 'GPT-4.5',
    provider: 'openai',
    description: 'Latest OpenAI generation. Best quality, highest cost.',
    cost: '$$$',
    default: false,
  },

  // Groq
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    description: 'Meta\'s Llama via Groq. Very fast, strong general performance.',
    cost: '$',
    default: false,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'groq',
    description: 'Tiny and blazing fast. Great for quick back-and-forth.',
    cost: '¢',
    default: false,
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    description: 'Mixture-of-experts model. Long context, solid reasoning.',
    cost: '$',
    default: false,
  },

  // Google
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Google\'s fast multimodal model. Quick and capable.',
    cost: '$',
    default: false,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s most capable model. Deep reasoning, long context.',
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
