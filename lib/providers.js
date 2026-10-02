import OpenAI from 'openai';

// All three use the OpenAI-compatible chat completions API.
// Groq and Google expose OpenAI-compatible endpoints, so one SDK covers all.

function openaiClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function groqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

function googleClient() {
  return new OpenAI({
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

const clients = { openai: openaiClient, groq: groqClient, google: googleClient };

export function getClient(provider) {
  const factory = clients[provider] ?? clients.openai;
  return factory();
}
