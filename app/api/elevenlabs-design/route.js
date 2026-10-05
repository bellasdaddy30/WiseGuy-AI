import { isAdmin, adminRequired } from '../../../lib/adminAuth';
import { describeVoice, checkDesignInput } from '../../../lib/voiceDesign';

export const maxDuration = 60;

// ElevenLabs Voice Design: a written description → preview clips.
// Returns the first preview as MP3, with its ID in X-Generated-Voice-Id.
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

  const description = describeVoice(body);
  const text = (body?.text ?? '').trim();
  const problem = checkDesignInput(description, text);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice/design', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_description: description, text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const code = err?.detail?.status ?? err?.detail?.code ?? '';
    console.error('[elevenlabs-design]', res.status, code, err?.detail?.message ?? '');
    if (res.status === 402 || code === 'paid_plan_required') {
      return Response.json({ error: 'Voice design needs a paid ElevenLabs plan.' }, { status: 402 });
    }
    if (code === 'quota_exceeded') return Response.json({ error: 'ElevenLabs credits used up.' }, { status: 429 });
    return Response.json(
      { error: typeof err?.detail?.message === 'string' ? err.detail.message : `ElevenLabs error ${res.status}` },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  const preview = data?.previews?.[0];
  if (!preview?.audio_base_64 || !preview?.generated_voice_id) {
    return Response.json({ error: 'ElevenLabs returned no preview.' }, { status: 502 });
  }

  return new Response(Buffer.from(preview.audio_base_64, 'base64'), {
    headers: {
      'Content-Type': preview.media_type || 'audio/mpeg',
      'X-Generated-Voice-Id': preview.generated_voice_id,
    },
  });
}
