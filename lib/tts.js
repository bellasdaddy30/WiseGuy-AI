export const TTS_PROVIDER_KEY         = 'smartass_tts_provider';
export const TTS_VOICE_GOOGLE_KEY     = 'smartass_tts_voice_google';
export const TTS_VOICE_ELEVENLABS_KEY = 'smartass_tts_voice_elevenlabs';
export const TTS_VOICE_OPENAI_KEY     = 'smartass_tts_voice_openai';
export const TTS_VOICE_ORPHEUS_KEY    = 'smartass_tts_voice_orpheus';

export const DEFAULT_TTS_PROVIDER         = 'browser';
export const DEFAULT_GOOGLE_VOICE         = 'Aoede';
export const DEFAULT_ELEVENLABS_VOICE     = 'N2lVS1w4EtoT3dr4eOWO';
export const DEFAULT_OPENAI_VOICE         = 'ash';
export const DEFAULT_ORPHEUS_VOICE        = 'autumn';

// Orpheus v1 English voices (Canopy Labs via Groq).
export const ORPHEUS_VOICES = [
  { id: 'autumn', name: 'Autumn ♀' },
  { id: 'diana',  name: 'Diana ♀'  },
  { id: 'hannah', name: 'Hannah ♀' },
  { id: 'austin', name: 'Austin ♂' },
  { id: 'daniel', name: 'Daniel ♂' },
  { id: 'troy',   name: 'Troy ♂'   },
];

// Voices supported by gpt-4o-mini-tts (OpenAI docs, Oct 2026).
export const OPENAI_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx',
  'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) }));

export const GOOGLE_VOICES = [
  { id: 'Kore',   name: 'Kore ♀'   },  // firm, clear
  { id: 'Aoede',  name: 'Aoede ♀'  },  // breezy, casual
  { id: 'Zephyr', name: 'Zephyr ♀' },  // bright, expressive
  { id: 'Puck',   name: 'Puck ♂'   },  // upbeat, playful
  { id: 'Charon', name: 'Charon ♂' },  // deep, informational
  { id: 'Fenrir', name: 'Fenrir ♂' },  // excitable, intense
];

export const ELEVENLABS_VOICES = [
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum'  }, // husky, trickster
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' }, // deep, energetic
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah'   }, // mature, confident
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' }, // playful, warm
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry'   }, // fierce
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger'   }, // laid-back
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian'   }, // deep, comforting
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam'    }, // dominant, firm
];

// Google Gemini TTS speech style per persona — sent as speech_metadata.style,
// so it shapes HOW the voice speaks without being read aloud.
export const PERSONA_VOICE_STYLE = {
  smartass:      'Dry, sharp, sarcastic wit. A little faster than normal, crisp and confident, with an audible smirk — the voice of someone who already knows the answer and finds your question mildly amusing.',
  unfiltered:    'Blunt, flat and matter-of-fact. No warmth, no softening, steady pace, every word landing hard.',
  roast_master:  'Comedy-roast delivery. Deadpan setup, a beat of silence, then hit the punchline hard with gleeful cruelty and a smug grin you can hear.',
  hype_man:      'Explosive, over-the-top hype. Loud, fast, breathless, every sentence climbing higher than the last, like a stadium announcer losing his mind.',
  street_smart:  'Smooth, laid-back, grounded and street-wise. Relaxed rhythm, confident and unbothered, like someone who has seen it all.',
  conspiracy_nut:'Hushed, paranoid and urgent, like someone is listening. Speed up when connecting the dots, drop to a near-whisper on the most suspicious parts.',
  professional:  'Crisp, formal, polished corporate presenter. Even pace, clear enunciation, calm authority. No humor in the voice.',
  coach:         'Drill-sergeant football coach at halftime. Loud, gravelly, forceful, barking each line with fire and urgency.',
  therapist:     'Soft, warm, slow and soothing, with gentle pauses. Calm, patient, completely present.',
  philosopher:   'Slow, low and contemplative, with long reflective pauses, as if pondering the abyss mid-sentence.',
  comedian:      'High-energy stand-up comic working a packed club. Animated and rapid-fire, big incredulous reactions, switches into exaggerated character voices to act out each person in the story, nails the timing, and cracks up at the punchlines.',
  pirate:        'A thick, old-school pirate accent — gravelly, raspy West Country English with heavy rolling Rs and hearty growls. Boisterous and theatrical, like a sea captain who has drunk too much rum.',
  evil_genius:   'A theatrical, aristocratic British supervillain. Velvety, menacing purr that savors every word, rising into grand dramatic flourishes and maniacal cackling laughter.',
  girlfriend:    'Sultry, low, breathy and slow. Intimate and teasing, like a seductive late-night voice whispering in your ear on the phone at 2am.',
  boyfriend:     'Deep, low, warm and confident. Close and intimate, a little husky, like every word is meant only for you.',
};

// ElevenLabs v3 character tag per persona, prepended to the text.
// Any of these switches the request to eleven_v3 (see app/api/tts).
export const PERSONA_ELEVENLABS_TAG = {
  pirate:      '[pirate voice]',
  evil_genius: '[evil scientist voice]',
  girlfriend:  '[seductive]',
  comedian:    '[excited]',
  conspiracy_nut: '[nervous]',
  hype_man:    '[excited]',
};

// ElevenLabs voice_settings per persona.
// stability: higher = more consistent/monotone; lower = more expressive.
// style: exaggeration of the voice character (0–1).
export const PERSONA_ELEVENLABS_SETTINGS = {
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
  comedian:      { stability: 0.15, style: 0.95 },
  pirate:        { stability: 0.20, style: 0.90 },
  evil_genius:   { stability: 0.30, style: 0.85 },
  girlfriend:    { stability: 0.40, style: 0.65 },
  boyfriend:     { stability: 0.50, style: 0.55 },
};

// Browser speechSynthesis per persona — rate and pitch adjustments.
export const PERSONA_BROWSER_TTS = {
  smartass:      { rate: 1.10, pitch: 1.00 },
  unfiltered:    { rate: 1.10, pitch: 1.00 },
  roast_master:  { rate: 0.95, pitch: 1.00 },
  hype_man:      { rate: 1.30, pitch: 1.25 },
  street_smart:  { rate: 1.00, pitch: 0.90 },
  conspiracy_nut:{ rate: 0.90, pitch: 1.10 },
  professional:  { rate: 1.00, pitch: 1.00 },
  coach:         { rate: 1.10, pitch: 0.85 },
  therapist:     { rate: 0.85, pitch: 1.05 },
  philosopher:   { rate: 0.80, pitch: 0.90 },
  comedian:      { rate: 1.20, pitch: 1.10 },
  pirate:        { rate: 0.85, pitch: 0.70 },
  evil_genius:   { rate: 0.88, pitch: 0.80 },
  girlfriend:    { rate: 1.00, pitch: 1.20 },
  boyfriend:     { rate: 0.95, pitch: 0.82 },
};

// Browser speechSynthesis can't truly whisper, so fake it with volume/speed/pitch.
export const BROWSER_SEGMENT_STYLE = {
  normal:  { volume: 0.85, rate: 1.00, pitch: 1.00 },
  laugh:   { volume: 0.95, rate: 1.15, pitch: 1.15 },
  whisper: { volume: 0.35, rate: 0.85, pitch: 1.05 },
  shout:   { volume: 1.00, rate: 1.12, pitch: 1.20 },
};

// Where to cut streaming text so a finished sentence can be spoken right away.
// Returns the index just past the first sentence end at or beyond minLen, or -1.
export function findSpeechCut(text, minLen = 1) {
  const re = /[.!?…]+["'”’)\]]*\s+/g;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (end >= minLen) return end;
  }
  return -1;
}

export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[>\-*+]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .trim();
}

// For browser speechSynthesis only — cap so it doesn't read an essay aloud.
// API providers (Google, ElevenLabs) handle long text natively; pass max=Infinity.
export function truncateForTts(text, max = 500) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSentence = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? '),
  );
  return lastSentence > 0 ? cut.slice(0, lastSentence + 1) : cut;
}

export function nextVoice(voices, currentId) {
  const idx = voices.findIndex(v => v.id === currentId);
  return voices[(idx + 1) % voices.length].id;
}
