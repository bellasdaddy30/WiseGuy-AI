import OpenAI from 'openai';

// All providers here speak the OpenAI-compatible chat completions API,
// so one SDK covers them — only the base URL and key change.
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    envVars: ['OPENAI_API_KEY'],
    baseURL: undefined,
  },
  groq: {
    label: 'Groq',
    envVars: ['GROQ_API_KEY'],
    baseURL: 'https://api.groq.com/openai/v1',
  },
  google: {
    label: 'Google Gemini',
    // GEMINI_API_KEY is the documented name; GOOGLE_API_KEY still works.
    envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  },
};

export class MissingKeyError extends Error {
  constructor(provider) {
    const cfg = PROVIDERS[provider];
    super(`${cfg.label} isn't set up: add ${cfg.envVars[0]} to .env.local and restart the dev server.`);
    this.name = 'MissingKeyError';
  }
}

// Strip whitespace, Windows line endings and wrapping quotes that sneak in
// when a key is pasted into .env.local.
function cleanKey(value) {
  if (!value) return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
}

export function getApiKey(provider) {
  const cfg = PROVIDERS[provider];
  for (const name of cfg.envVars) {
    const key = cleanKey(process.env[name]);
    if (key) return key;
  }
  return '';
}

export function getProviderLabel(provider) {
  return PROVIDERS[provider]?.label ?? provider;
}

export function getClient(provider) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = getApiKey(provider);
  if (!apiKey) throw new MissingKeyError(provider);

  return new OpenAI({ apiKey, baseURL: cfg.baseURL });
}
