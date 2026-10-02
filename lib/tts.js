export const TTS_PROVIDER_KEY       = 'smartass_tts_provider';
export const TTS_VOICE_GOOGLE_KEY   = 'smartass_tts_voice_google';
export const TTS_VOICE_ELEVENLABS_KEY = 'smartass_tts_voice_elevenlabs';

export const DEFAULT_TTS_PROVIDER         = 'browser';
export const DEFAULT_GOOGLE_VOICE         = 'Aoede';
export const DEFAULT_ELEVENLABS_VOICE     = 'N2lVS1w4EtoT3dr4eOWO';

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

// Google TTS system_instruction — controls HOW the voice speaks, not the content.
export const PERSONA_VOICE_STYLE = {
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
  pirate:        { rate: 0.85, pitch: 0.70 },
  evil_genius:   { rate: 0.88, pitch: 0.80 },
  girlfriend:    { rate: 1.00, pitch: 1.20 },
  boyfriend:     { rate: 0.95, pitch: 0.82 },
};

// Browser speechSynthesis can't truly whisper, so fake it with volume/speed/pitch.
export const BROWSER_SEGMENT_STYLE = {
  normal:  { volume: 0.85, rate: 1.00, pitch: 1.00 },
  whisper: { volume: 0.35, rate: 0.85, pitch: 1.05 },
  shout:   { volume: 1.00, rate: 1.12, pitch: 1.20 },
};

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
