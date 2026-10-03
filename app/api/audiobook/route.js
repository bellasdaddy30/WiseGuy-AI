import { isVoiceId, MAX_CHUNK_CHARS, MAX_CHUNK_VOICES } from '../../../lib/audiobook';

// Renders one chunk of an audiobook chapter with ElevenLabs Text to Dialogue
// (eleven_v3). The browser sends chunks one at a time so a failure costs one
// chunk, not the chapter. The API key never leaves the server.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  const inputs = body?.inputs;
  if (!Array.isArray(inputs) || !inputs.length) {
    return Response.json({ error: 'No lines to render.' }, { status: 400 });
  }
  if (inputs.some(x => typeof x?.text !== 'string' || !x.text.trim() || !isVoiceId(x.voice_id))) {
    return Response.json({ error: 'Every line needs text and a valid voice ID.' }, { status: 400 });
  }
  const chars = inputs.reduce((n, x) => n + x.text.length, 0);
  if (chars > MAX_CHUNK_CHARS + 200) {
    return Response.json({ error: 'Chunk too long.' }, { status: 400 });
  }
  if (new Set(inputs.map(x => x.voice_id)).size > MAX_CHUNK_VOICES) {
    return Response.json({ error: 'Too many voices in one chunk.' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs key not set. Add ELEVENLABS_API_KEY to .env.local and restart.' },
      { status: 500 }
    );
  }

  let res;
  try {
    res = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: 'eleven_v3',
        inputs: inputs.map(({ text, voice_id }) => ({ text, voice_id })),
      }),
    });
  } catch (err) {
    console.error('[audiobook] network', err?.message);
    return Response.json({ error: "Couldn't reach ElevenLabs." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const code = detail?.detail?.status ?? '';
    console.error('[audiobook]', res.status, code, detail?.detail?.message ?? '');
    if (res.status === 401) return Response.json({ error: 'ElevenLabs rejected the API key.' }, { status: 502 });
    if (code === 'quota_exceeded') {
      return Response.json({ error: 'ElevenLabs credits used up.' }, { status: 429 });
    }
    if (res.status === 429) return Response.json({ error: 'ElevenLabs is busy. Wait a minute, then continue.' }, { status: 429 });
    if (res.status === 402 || code === 'paid_plan_required') {
      return Response.json({ error: 'One of these voices needs a paid ElevenLabs plan.' }, { status: 502 });
    }
    return Response.json({ error: `ElevenLabs error ${res.status}${code ? ` (${code})` : ''}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}
