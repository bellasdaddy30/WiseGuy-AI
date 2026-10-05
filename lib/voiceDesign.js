// Shared by the Settings voice designer and its API routes.
//
// ElevenLabs removed the old preset-based designer (gender/age/accent fields)
// on 23 Feb 2026. Its replacement, Voice Design, takes a written description
// instead, so the buttons in Settings are turned into a sentence here. Typing
// your own description overrides the buttons.

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 1000;
export const SAMPLE_MIN = 100;
export const SAMPLE_MAX = 1000;

const AGE = { young: 'young adult', middle_aged: 'middle-aged', old: 'older' };

function strength(s) {
  const n = Number(s);
  if (!(n > 0)) return '';
  if (n < 0.75) return 'light';
  if (n < 1.4) return 'clear';
  return 'strong';
}

export function describeVoice({ description, gender, age, accent, accent_strength } = {}) {
  const own = typeof description === 'string' ? description.trim() : '';
  if (own) return own.slice(0, DESCRIPTION_MAX);
  const who = `${AGE[age] ?? 'middle-aged'} ${gender === 'female' ? 'woman' : 'man'}`;
  const article = /^[aeiou]/i.test(who) ? 'An' : 'A';
  const place = accent ? accent[0].toUpperCase() + accent.slice(1) : '';
  const acc = place ? `, with a ${strength(accent_strength) || 'clear'} ${place} accent` : '';
  return `${article} ${who} with a natural, expressive speaking voice${acc}. Studio-quality recording, no background noise.`;
}

// Returns an error message, or '' when usable.
export function checkDesignInput(description, text) {
  if (description.length < DESCRIPTION_MIN) return `Describe the voice in at least ${DESCRIPTION_MIN} characters.`;
  if (description.length > DESCRIPTION_MAX) return `Keep the description under ${DESCRIPTION_MAX} characters.`;
  const t = (text ?? '').trim();
  if (t.length < SAMPLE_MIN) return `Sample text must be at least ${SAMPLE_MIN} characters (ElevenLabs' minimum). It's ${t.length} now.`;
  if (t.length > SAMPLE_MAX) return `Sample text must be under ${SAMPLE_MAX} characters.`;
  return '';
}
