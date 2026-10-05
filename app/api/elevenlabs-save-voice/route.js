export async function POST(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ELEVENLABS_API_KEY not set.' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { voice_name, generated_voice_id } = body;
  if (!voice_name?.trim() || !generated_voice_id) {
    return Response.json({ error: 'Name and voice ID required.' }, { status: 400 });
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voice-generation/create-voice', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_name: voice_name.trim(), generated_voice_id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return Response.json(
      { error: err?.detail?.message ?? `Save error ${res.status}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  return Response.json({ voice_id: data.voice_id });
}
