import { PERSONA_VOICE_STYLE, PERSONA_ELEVENLABS_SETTINGS, PERSONA_ELEVENLABS_TAG, PERSONA_ELEVENLABS_VOICE } from '../../../lib/tts';
import { getApiKey } from '../../../lib/providers';

export const maxDuration = 30;

// Fade the first and last 5ms of 16-bit LE PCM to silence to prevent click artifacts
function applyFades(pcm, sampleRate, fadeSecs = 0.02) {
  // Ensure byte-aligned to 16-bit samples
  const buf = pcm.length % 2 === 0 ? pcm : pcm.slice(0, -1);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const totalSamples = buf.length / 2;
  const fadeSamples  = Math.min(Math.floor(sampleRate * fadeSecs), Math.floor(totalSamples / 2));
  for (let i = 0; i < fadeSamples; i++) {
    const gain   = i / fadeSamples;
    const inOff  = i * 2;
    const outOff = (totalSamples - 1 - i) * 2;
    view.setInt16(inOff,  Math.round(view.getInt16(inOff,  true) * gain), true);
    view.setInt16(outOff, Math.round(view.getInt16(outOff, true) * gain), true);
  }
  return buf;
}

function buildWavHeader(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const buf  = new ArrayBuffer(44);
  const view = new DataView(buf);
  const byteRate   = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  view.setUint32( 0, 0x52494646, false); // 'RIFF'
  view.setUint32( 4, 36 + pcmBytes, true);
  view.setUint32( 8, 0x57415645, false); // 'WAVE'
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, pcmBytes, true);

  return new Uint8Array(buf);
}



async function googleTts(text, voiceName, persona) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Google API key not configured.' }, { status: 500 });
  }

  const requestBody = {
    // speechMetadata.style directs the delivery without being spoken.
    contents: [{
      parts: [{
        text,
        ...(PERSONA_VOICE_STYLE[persona] && { speechMetadata: { style: PERSONA_VOICE_STYLE[persona] } }),
      }],
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[tts/google]', res.status, err.slice(0, 300));
    if (res.status === 429) {
      return Response.json({ error: 'Google voice limit reached — using the browser voice for now.' }, { status: 429 });
    }
    return Response.json({ error: `Google TTS error ${res.status}.` }, { status: 502 });
  }

  const data   = await res.json();
  const part   = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const b64    = part?.data;
  const mime   = part?.mimeType ?? '';

  if (!b64) {
    return Response.json({ error: 'No audio in Google TTS response.' }, { status: 502 });
  }

  const rawPcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const rateM  = mime.match(/rate=(\d+)/);
  const rate   = rateM ? parseInt(rateM[1]) : 24000;
  const pcm    = applyFades(rawPcm, rate);
  const header = buildWavHeader(pcm.length, rate);
  const wav    = new Uint8Array(header.length + pcm.length);
  wav.set(header);
  wav.set(pcm, header.length);

  return new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
}

async function elevenLabsTts(rawText, voiceId, persona) {
  const tag  = PERSONA_ELEVENLABS_TAG[persona];
  const text = tag ? `${tag} ${rawText}` : rawText;

  // Each persona has its own voice actor — override the user's generic pick.
  const resolvedVoiceId = PERSONA_ELEVENLABS_VOICE[persona] ?? voiceId;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs key not set. Add ELEVENLABS_API_KEY to .env.local and restart.' },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        // eleven_v3 understands [tags]; turbo would read them aloud.
        model_id: /\[[a-z][a-z ]*\]/i.test(text) ? 'eleven_v3' : 'eleven_turbo_v2_5',
        voice_settings: {
            similarity_boost: 0.75,
            use_speaker_boost: true,
            ...(PERSONA_ELEVENLABS_SETTINGS[persona] ?? { stability: 0.50, style: 0.40 }),
          },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = body?.detail?.code ?? '';
    console.error('[tts/elevenlabs]', res.status, code);
    if (res.status === 402 || code === 'paid_plan_required') {
      return Response.json({ error: 'That ElevenLabs voice requires a paid plan. Switch to Google or Browser TTS, or pick a different voice.' }, { status: 502 });
    }
    if (code === 'quota_exceeded') {
      return Response.json({ error: 'ElevenLabs credits used up — using the browser voice for now.' }, { status: 429 });
    }
    if (res.status === 429) {
      return Response.json({ error: 'ElevenLabs is busy — using the browser voice for now.' }, { status: 429 });
    }
    return Response.json({ error: `ElevenLabs error ${res.status}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}

// OpenAI gpt-4o-mini-tts: `instructions` steers delivery without being spoken.
async function openAiTts(text, voice, persona) {
  const apiKey = getApiKey('openai');
  if (!apiKey) {
    return Response.json({ error: 'OpenAI voice not set up. Add OPENAI_API_KEY to .env.local and restart.' }, { status: 500 });
  }

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      response_format: 'mp3',
      ...(PERSONA_VOICE_STYLE[persona] && { instructions: PERSONA_VOICE_STYLE[persona] }),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[tts/openai]', res.status, body?.error?.code ?? '', body?.error?.message ?? '');
    if (res.status === 429) {
      return Response.json({ error: 'OpenAI voice limit or credits reached — using the browser voice for now.' }, { status: 429 });
    }
    if (res.status === 401) {
      return Response.json({ error: 'OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local.' }, { status: 502 });
    }
    return Response.json({ error: `OpenAI voice error ${res.status}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}

// Inject Orpheus emotion tags at sentence boundaries based on persona.
// Tags like <laugh>, <sigh>, <chuckle> trigger real vocal reactions.
function injectOrpheusEmotions(text, persona) {
  const rules = {
    wiseguy:        { tag: '<chuckle>', every: 3 },
    roast_master:   { tag: '<laugh>',   every: 2 },
    hype_man:       { tag: '<laugh>',   every: 2 },
    unfiltered:     { tag: '<sigh>',    every: 3 },
    conspiracy_nut: { tag: '<gasp>',    every: 3 },
    coach:          { tag: '<groan>',   every: 3 },
    therapist:      { tag: '<sigh>',    every: 3 },
    philosopher:    { tag: '<sigh>',    every: 3 },
    pirate:         { tag: '<laugh>',   every: 2 },
    evil_genius:    { tag: '<laugh>',   every: 2 },
    street_smart:   { tag: '<chuckle>', every: 3 },
  };
  const rule = rules[persona];
  if (!rule) return text;
  const parts = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  return parts.map((s, i) =>
    (i + 1) % rule.every === 0 ? s.trimEnd() + ` ${rule.tag} ` : s
  ).join('');
}

async function orpheusTts(text, voice, persona) {
  const apiKey = getApiKey('groq');
  if (!apiKey) {
    return Response.json({ error: 'Groq key not set. Add GROQ_API_KEY to .env.local.' }, { status: 500 });
  }

  const enhanced = injectOrpheusEmotions(text, persona);

  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-v1-english',
      voice: voice || 'tara',
      input: enhanced,
      response_format: 'wav',
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[tts/orpheus]', res.status, JSON.stringify(body).slice(0, 200));
    if (res.status === 429) {
      return Response.json({ error: 'Orpheus rate limited — try again in a moment.' }, { status: 429 });
    }
    return Response.json({ error: `Orpheus TTS error ${res.status}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/wav' } });
}

const MAX_TTS_CHARS = 4000;

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { text, provider, voice, persona } = body;

  if (!text?.trim()) {
    return Response.json({ error: 'No text provided.' }, { status: 400 });
  }
  if (text.length > MAX_TTS_CHARS) {
    return Response.json({ error: `Text too long for TTS (${text.length} chars, max ${MAX_TTS_CHARS}).` }, { status: 400 });
  }

  if (provider === 'google')      return googleTts(text, voice || 'Aoede', persona);
  if (provider === 'elevenlabs')  return elevenLabsTts(text, voice || 'N2lVS1w4EtoT3dr4eOWO', persona);
  if (provider === 'openai')      return openAiTts(text, voice || 'ash', persona);
  if (provider === 'orpheus')     return orpheusTts(text, voice || 'autumn', persona);

  return Response.json({ error: 'Unknown TTS provider.' }, { status: 400 });
}
