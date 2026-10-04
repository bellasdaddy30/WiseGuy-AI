import { validateMusicRequest, buildMusicBody } from '../../../lib/music';

// Generates one music track with ElevenLabs Music. The API key never leaves
// the server. Songs can take a while to render, so this waits for the full
// track and streams it back as MP3.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  const req = {
    prompt: body?.prompt,
    lyrics: body?.lyrics || '',
    seconds: body?.seconds == null || body.seconds === '' ? null : Number(body.seconds),
    instrumental: !!body?.instrumental,
  };
  const problem = validateMusicRequest(req);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs key not set. Add ELEVENLABS_API_KEY to .env.local and restart.' },
      { status: 500 }
    );
  }

  let res;
  try {
    res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildMusicBody(req)),
    });
  } catch (err) {
    console.error('[music] network', err?.message);
    return Response.json({ error: "Couldn't reach ElevenLabs." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const code = detail?.detail?.status ?? '';
    console.error('[music]', res.status, code, detail?.detail?.message ?? '');
    if (res.status === 401) return Response.json({ error: 'ElevenLabs rejected the API key.' }, { status: 502 });
    if (code === 'quota_exceeded') return Response.json({ error: 'ElevenLabs credits used up.' }, { status: 429 });
    if (res.status === 429) return Response.json({ error: 'ElevenLabs is busy. Wait a minute and try again.' }, { status: 429 });
    if (res.status === 402 || code === 'paid_plan_required') {
      return Response.json({ error: 'Music generation needs a paid ElevenLabs plan.' }, { status: 502 });
    }
    if (code === 'bad_prompt' || code === 'bad_composition_plan') {
      return Response.json(
        { error: 'ElevenLabs refused that prompt (it may name a real artist or copyrighted lyrics). Rephrase and try again.' },
        { status: 400 }
      );
    }
    return Response.json({ error: `ElevenLabs error ${res.status}${code ? ` (${code})` : ''}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}
