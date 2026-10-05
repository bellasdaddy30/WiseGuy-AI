import { getApiKey } from '../../../lib/providers';

// Speech to text for voice input, used where the browser's own speech
// recognition is unavailable (iPhone Home Screen app). Whisper on Groq: free
// tier, same GROQ_API_KEY as chat. Each request counts as at least 10 s of
// audio against Groq's free daily allowance.

export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // ~5 min of compressed speech; far more than one utterance
const ALLOWED = /^audio\/(webm|mp4|m4a|x-m4a|aac|mpeg|ogg|wav)/;

export async function POST(request) {
  const apiKey = getApiKey('groq');
  if (!apiKey) {
    return Response.json({ error: 'Voice input needs GROQ_API_KEY in .env.local.' }, { status: 500 });
  }

  let form;
  try { form = await request.formData(); } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No audio received.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Recording too long.' }, { status: 413 });
  }
  if (file.type && !ALLOWED.test(file.type)) {
    return Response.json({ error: `Unsupported audio type (${file.type}).` }, { status: 415 });
  }

  const out = new FormData();
  out.append('file', file, file.name || 'speech.m4a');
  out.append('model', 'whisper-large-v3-turbo');
  out.append('language', 'en');
  out.append('response_format', 'json');

  let res;
  try {
    res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: out,
    });
  } catch (err) {
    console.error('[transcribe] network', err?.message);
    return Response.json({ error: "Couldn't reach the transcription service." }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[transcribe]', res.status, body?.error?.message ?? '');
    if (res.status === 429) return Response.json({ error: 'Voice input limit reached. Try again in a minute.' }, { status: 429 });
    if (res.status === 401) return Response.json({ error: 'Groq rejected the API key.' }, { status: 502 });
    return Response.json({ error: `Transcription error ${res.status}.` }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  return Response.json({ text: (data.text ?? '').trim() });
}
