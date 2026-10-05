export const maxDuration = 30;

export async function POST(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ELEVENLABS_API_KEY not set.' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { gender, age, accent, accent_strength, text } = body;
  if (!text?.trim()) {
    return Response.json({ error: 'Sample text required.' }, { status: 400 });
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voice-generation/generate-voice', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gender:           gender       ?? 'male',
      age:              age          ?? 'middle_aged',
      accent:           accent       ?? 'american',
      accent_strength:  parseFloat(accent_strength) || 1.0,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 402) {
      return Response.json(
        { error: 'Voice design requires an ElevenLabs Creator plan or above.' },
        { status: 402 }
      );
    }
    return Response.json(
      { error: err?.detail?.message ?? `ElevenLabs error ${res.status}` },
      { status: 502 }
    );
  }

  const voiceId = res.headers.get('Generated-Voice-Id') ?? '';
  const audio   = await res.arrayBuffer();

  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Generated-Voice-Id': voiceId,
    },
  });
}
