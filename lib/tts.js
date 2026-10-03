export const TTS_PROVIDER_KEY         = 'smartass_tts_provider';
export const VOICE_MODE_KEY           = 'smartass_voice_mode';
export const AI_VOICE_KEY             = 'smartass_ai_voice';
export const HANDS_FREE_KEY           = 'smartass_hands_free';
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
  smartass:
    'Fast, punchy, sharp delivery with dry sarcastic wit and an audible smirk. ' +
    'No wind-up — hits the point immediately. Slightly faster than normal, crisp and confident. ' +
    'Voice of someone who already knew you were wrong before you finished talking.',
  unfiltered:
    'Flat, deliberate, and slow. Every word lands like a punch. No warmth, no softening. ' +
    'The pace of someone who knows the truth is heavy and does not rush it.',
  roast_master:
    'Comedy-roast delivery. Deadpan, measured setup, a long beat of silence, then the punchline hits fast and hard. ' +
    'Gleeful cruelty, smugness you can hear. The voice of someone who has been sharpening that line all day.',
  hype_man:
    'Explosive, breathless, over-the-top hype. Very fast, every sentence louder and higher than the last. ' +
    'Stadium announcer energy. Physically incapable of being underwhelmed.',
  street_smart:
    'Smooth, unhurried, laid-back confidence. Slightly slower than average, relaxed rhythm. ' +
    'The voice of someone who has seen everything and is not impressed but will still school you.',
  conspiracy_nut:
    'Starts slow and hushed, like someone might be listening. Builds in speed and intensity as connections emerge. ' +
    'Drops to a near-whisper on the most shocking revelations. Urgent paranoia under every word.',
  professional:
    'Crisp, formal, authoritative. Even measured pace, precise enunciation, calm command. ' +
    'No warmth, no humor, no inflection except for structure. The voice of total competence.',
  coach:
    'Short staccato bursts. Punchy and forceful, like a drill sergeant at halftime. ' +
    'Each sentence is a command. Volume and urgency build when pushing harder. Gravelly intensity.',
  therapist:
    'Very slow, warm, and soothing. Genuine pauses that invite reflection. ' +
    'Soft but not quiet — present and attentive. Every word chosen carefully, like they actually mean it.',
  philosopher:
    'Very slow and low, deeply contemplative. Long pauses before key lines — they are thinking, not hesitating. ' +
    'Each word is placed deliberately, as if the right word actually matters.',
  comedian:
    'Theatrical and variable. Slow conspiratorial setup, then the punchline lands fast and loud. ' +
    'Reaction beat of disbelief or delight. Switches into exaggerated voices for characters in the story. ' +
    'High-energy stand-up club at capacity on a Friday night.',
  pirate:
    'Thick, gravelly, old-school pirate — West Country English with heavy rolling Rs and rolling rhythm. ' +
    'Boisterous and big, like projecting over wind and waves. Occasional rum-soaked chuckle.',
  evil_genius:
    'Velvety, slow, aristocratic — savoring each syllable like fine wine. ' +
    'A menacing purr that builds into grand theatrical flourishes at the climax of the monologue. ' +
    'Maniacal but controlled. British supervillain energy.',
  girlfriend:
    'Warm, breathy, intimate. Conversational pace that speeds up when excited or jealous. ' +
    'Slows down and softens when emotional. Close, like talking directly into your ear.',
  boyfriend:
    'Deep, unhurried, confident. Warm but steady. Close and direct, like someone completely at ease with you. ' +
    'A little husky. Every word meant specifically for you.',
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
// Rate: 0.75 = very slow/deliberate, 1.0 = normal, 1.4 = fast/breathless.
// Pitch: lower = authoritative/deep, higher = expressive/bright.
export const PERSONA_BROWSER_TTS = {
  smartass:      { rate: 1.15, pitch: 1.00 }, // fast, punchy
  unfiltered:    { rate: 0.88, pitch: 0.92 }, // slow, flat, deliberate
  roast_master:  { rate: 0.95, pitch: 0.98 }, // measured setup, lands hard
  hype_man:      { rate: 1.40, pitch: 1.25 }, // breathless, loud, fast
  street_smart:  { rate: 0.95, pitch: 0.88 }, // smooth, unhurried, low
  conspiracy_nut:{ rate: 0.85, pitch: 1.08 }, // hushed, building urgency
  professional:  { rate: 1.00, pitch: 0.95 }, // even, measured, authoritative
  coach:         { rate: 1.12, pitch: 0.82 }, // staccato bursts, gravelly
  therapist:     { rate: 0.80, pitch: 1.05 }, // slow, warm, with pauses
  philosopher:   { rate: 0.75, pitch: 0.88 }, // very slow, contemplative
  comedian:      { rate: 1.20, pitch: 1.12 }, // animated, theatrical
  pirate:        { rate: 0.90, pitch: 0.72 }, // rolling, gravelly, boisterous
  evil_genius:   { rate: 0.82, pitch: 0.78 }, // velvety slow, building
  girlfriend:    { rate: 1.05, pitch: 1.22 }, // warm, bright, speeds up excited
  boyfriend:     { rate: 0.93, pitch: 0.85 }, // confident, unhurried, warm
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
