export const TTS_PROVIDER_KEY       = 'smartass_tts_provider';
export const TTS_VOICE_GOOGLE_KEY   = 'smartass_tts_voice_google';
export const TTS_VOICE_ELEVENLABS_KEY = 'smartass_tts_voice_elevenlabs';

export const DEFAULT_TTS_PROVIDER         = 'browser';
export const DEFAULT_GOOGLE_VOICE         = 'Kore';
export const DEFAULT_ELEVENLABS_VOICE     = 'N2lVS1w4EtoT3dr4eOWO';

export const GOOGLE_VOICES = [
  { id: 'Kore',   name: 'Kore'   },
  { id: 'Puck',   name: 'Puck'   },
  { id: 'Charon', name: 'Charon' },
  { id: 'Fenrir', name: 'Fenrir' },
  { id: 'Aoede',  name: 'Aoede'  },
  { id: 'Zephyr', name: 'Zephyr' },
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
