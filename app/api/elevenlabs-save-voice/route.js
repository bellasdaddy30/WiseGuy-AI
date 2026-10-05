import { isAdmin, adminRequired } from '../../../lib/adminAuth';
import { describeVoice, DESCRIPTION_MIN } from '../../../lib/voiceDesign';

// Saves a Voice Design preview to the ElevenLabs account.
export async function POST(request) {
  if (!isAdmin(request)) return adminRequired();

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: 'ELEVENLABS_API_KEY not set.' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { voice_name, generated_voice_id } = body ?? {};
  if (!voice_name?.trim() || !generated_voice_id) {
    return Response.json({ error: 'Name and voice ID required.' }, { status: 400 });
  }
  // The save call needs the same description the preview was made from.
  const voice_description = describeVoice(body);
  if (voice_description.length < DESCRIPTION_MIN) {
    return Response.json({ error: 'Voice description missing.' }, { status: 400 });
  }

  const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_name: voice_name.trim().slice(0, 50), voice_description, generated_voice_id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[elevenlabs-save-voice]', res.status, err?.detail?.status ?? '', err?.detail?.message ?? '');
    return Response.json(
      { error: typeof err?.detail?.message === 'string' ? err.detail.message : `Save error ${res.status}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  return Response.json({ voice_id: data.voice_id });
}
