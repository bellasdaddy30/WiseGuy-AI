export const MODELS = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and cheap. Handles most conversations well.',
    cost: '$',
    default: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Smarter, better reasoning. Worth it for complex tasks.',
    cost: '$$',
    default: false,
  },
  {
    id: 'gpt-4.5',
    name: 'GPT-4.5',
    description: 'Latest generation. Best quality, highest cost.',
    cost: '$$$',
    default: false,
  },
];

export const DEFAULT_MODEL = MODELS.find(m => m.default).id;

export function isValidModel(id) {
  return MODELS.some(m => m.id === id);
}
