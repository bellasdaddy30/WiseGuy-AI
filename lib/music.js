// Music generation helpers (shared by the Music page and its API route).
//
// ElevenLabs Music turns a text prompt into a finished track: instruments and,
// unless told otherwise, sung vocals. Lyrics are passed inside the prompt.
// Length limits below follow the documented 3 s – 10 min range.

export const MIN_MUSIC_SECONDS = 3;
export const MAX_MUSIC_SECONDS = 600;
export const MAX_PROMPT_CHARS = 2000;
export const MAX_LYRICS_CHARS = 3000;

// Returns an error message, or '' when the request is usable.
export function validateMusicRequest({ prompt, lyrics, seconds, instrumental }) {
  if (typeof prompt !== 'string' || !prompt.trim()) return 'Describe the music you want.';
  if (prompt.length > MAX_PROMPT_CHARS) return `Keep the description under ${MAX_PROMPT_CHARS} characters.`;
  if (lyrics != null && typeof lyrics !== 'string') return 'Lyrics must be text.';
  if (lyrics && lyrics.length > MAX_LYRICS_CHARS) return `Keep the lyrics under ${MAX_LYRICS_CHARS} characters.`;
  if (instrumental && lyrics?.trim()) return 'Turn off "Instrumental only" to use lyrics.';
  if (seconds != null) {
    if (!Number.isFinite(seconds) || seconds < MIN_MUSIC_SECONDS || seconds > MAX_MUSIC_SECONDS) {
      return `Length must be between ${MIN_MUSIC_SECONDS} and ${MAX_MUSIC_SECONDS} seconds.`;
    }
  }
  return '';
}

// Builds the ElevenLabs request body. Lyrics ride inside the prompt.
export function buildMusicBody({ prompt, lyrics, seconds, instrumental }) {
  const text = lyrics?.trim()
    ? `${prompt.trim()}\n\nLyrics:\n${lyrics.trim()}`
    : prompt.trim();
  const body = { prompt: text };
  if (seconds != null) body.music_length_ms = Math.round(seconds * 1000);
  if (instrumental) body.force_instrumental = true;
  return body;
}
