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

const PERSONA_VOICE_STYLE = {
  smartass:      'Speak with sharp, dry wit. Slightly faster than normal, crisp and confident delivery. The voice of someone who already knows the answer.',
  unfiltered:    'Speak bluntly and directly. Flat, matter-of-fact delivery with no softening.',
  roast_master:  'Speak with perfect comedic timing. Dry deadpan setup, then land the punchline with extra emphasis and a slight dramatic pause before the burn.',
  hype_man:      'Speak with explosive, barely-contained excitement. Every sentence peaks higher than the last. Maximum energy — you are losing your mind over how incredible this is.',
  street_smart:  'Speak with a smooth, grounded, no-nonsense cadence. Measured and confident, like someone who has seen it all.',
  conspiracy_nut:'Speak in a hushed, urgent, conspiratorial tone — like someone is definitely listening. Occasional dramatic emphasis on the most suspicious parts.',
  professional:  'Speak in a crisp, formal, measured tone. Clear enunciation. Authoritative and precise.',
  coach:         'Speak with raw, intense, motivational energy. Forceful emphasis. Like a halftime speech when the team is down.',
  therapist:     'Speak in a soft, warm, unhurried tone. Gentle pauses. Calm and present, like you have all the time in the world.',
  philosopher:   'Speak slowly and deliberately, with long reflective pauses that give weight to each word.',
  pirate:        'Speak exactly like a gruff, weathered sea pirate. Raspy and hearty with rolling Rs, dramatic growls, theatrical pauses, and swashbuckling energy throughout.',
  evil_genius:   'Speak with theatrical menace and self-satisfied grandeur. Deliberate, dramatic, the villain who has already won and wants you to know it.',
  girlfriend:    'Speak in a warm, breathy, intimate tone. Playful and affectionate with a smile always audible in your voice.',
  boyfriend:     'Speak in a deep, warm, confident tone. Low and close, protective and a little intense — like every word is meant only for them.',
};

const PERSONA_ELEVENLABS_SETTINGS = {
  smartass:      { stability: 0.45, style: 0.50 },
  unfiltered:    { stability: 0.60, style: 0.20 },
  roast_master:  { stability: 0.30, style: 0.80 },
  hype_man:      { stability: 0.15, style: 0.95 },
  street_smart:  { stability: 0.55, style: 0.40 },
  conspiracy_nut:{ stability: 0.35, style: 0.70 },
  professional:  { stability: 0.70, style: 0.10 },
  coach:         { stability: 0.25, style: 0.85 },
  therapist:     { stability: 0.65, style: 0.25 },
  philosopher:   { stability: 0.60, style: 0.35 },
  pirate:        { stability: 0.20, style: 0.90 },
  evil_genius:   { stability: 0.30, style: 0.85 },
  girlfriend:    { stability: 0.40, style: 0.65 },
  boyfriend:     { stability: 0.50, style: 0.55 },
};

async function googleTts(text, voiceName, persona) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Google API key not configured.' }, { status: 500 });
  }

  const styleInstruction = PERSONA_VOICE_STYLE[persona];
  const requestBody = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  };
  if (styleInstruction) {
    requestBody.system_instruction = { parts: [{ text: styleInstruction }] };
  }

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
    return Response.json({ error: `Google TTS error ${res.status}.` }, { status: 502 });
  }

  const data   = await res.json();
  const part   = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const b64    = part?.data;
  const mime   = part?.mimeType ?? '';

  if (!b64) {
    return Response.json({ error: 'No audio in Google TTS response.' }, { status: 502 });
  }

  const pcm    = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const rateM  = mime.match(/rate=(\d+)/);
  const rate   = rateM ? parseInt(rateM[1]) : 24000;
  const header = buildWavHeader(pcm.length, rate);
  const wav    = new Uint8Array(header.length + pcm.length);
  wav.set(header);
  wav.set(pcm, header.length);

  return new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
}

async function elevenLabsTts(text, voiceId, persona) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ElevenLabs key not set. Add ELEVENLABS_API_KEY to .env.local and restart.' },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
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
      return Response.json({ error: 'ElevenLabs credits exhausted for this month. Switch to Google or Browser TTS.' }, { status: 502 });
    }
    return Response.json({ error: `ElevenLabs error ${res.status}.` }, { status: 502 });
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } });
}

export async function POST(request) {
  const { text, provider, voice, persona } = await request.json();

  if (!text?.trim()) {
    return Response.json({ error: 'No text provided.' }, { status: 400 });
  }

  if (provider === 'google')      return googleTts(text, voice || 'Aoede', persona);
  if (provider === 'elevenlabs')  return elevenLabsTts(text, voice || 'N2lVS1w4EtoT3dr4eOWO', persona);

  return Response.json({ error: 'Unknown TTS provider.' }, { status: 400 });
}
