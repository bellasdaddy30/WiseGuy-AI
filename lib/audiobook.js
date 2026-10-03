// Audiobook rendering helpers (shared by the Audiobook page and its API route).
//
// ElevenLabs Text to Dialogue takes a list of { text, voice_id } turns and
// renders them as one audio clip. Requests are limited, so a chapter is split
// into chunks of consecutive lines. Limits below are kept under what the docs
// state (about 2,000 characters per request for reliable output, at most
// 10 different voices per request).

export const AUDIOBOOK_VOICES_KEY = 'smartass_audiobook_voices';
export const AUDIOBOOK_TAGS_KEY = 'smartass_audiobook_tags';
export const MAX_CHUNK_CHARS = 1800;
export const MAX_CHUNK_VOICES = 10;

const VOICE_ID_RE = /^[A-Za-z0-9]{10,40}$/;

export function isVoiceId(id) {
  return typeof id === 'string' && VOICE_ID_RE.test(id);
}

export function lineText(line, useTags) {
  return useTags && line.tag ? `[${line.tag}] ${line.text}` : line.text;
}

// Split a long line at sentence ends so no single turn exceeds the limit.
function splitLong(text, limit) {
  if (text.length <= limit) return [text];
  const out = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?…])\s+/)) {
    if (cur && cur.length + 1 + s.length > limit) { out.push(cur); cur = s; }
    else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

// lines: [{ speaker, text, tag? }], voiceMap: { speaker: voiceId }
// Returns chunks: [{ inputs: [{ text, voice_id }], first, last, chars }]
// where first/last are line indexes, so a failed chunk can be retried alone.
export function buildChunks(lines, voiceMap, useTags = true) {
  const chunks = [];
  let cur = null;
  const start = i => ({ inputs: [], voices: new Set(), chars: 0, first: i, last: i });

  lines.forEach((line, i) => {
    const voice_id = voiceMap[line.speaker];
    for (const text of splitLong(lineText(line, useTags), MAX_CHUNK_CHARS)) {
      const fits = cur
        && cur.chars + text.length <= MAX_CHUNK_CHARS
        && (cur.voices.has(voice_id) || cur.voices.size < MAX_CHUNK_VOICES);
      if (!fits) { if (cur) chunks.push(cur); cur = start(i); }
      cur.inputs.push({ text, voice_id });
      cur.voices.add(voice_id);
      cur.chars += text.length;
      cur.last = i;
    }
  });
  if (cur) chunks.push(cur);
  return chunks.map(({ voices, ...c }) => c);
}

export function missingVoices(speakers, voiceMap) {
  return speakers.filter(s => !isVoiceId(voiceMap[s]));
}

// Basic shape check for a chapter file exported by Ashen Voice Studio.
export function validateChapter(doc) {
  if (!doc || !Array.isArray(doc.lines) || !doc.lines.length) return 'That file has no lines.';
  if (doc.lines.some(l => typeof l.speaker !== 'string' || typeof l.text !== 'string')) {
    return 'Every line needs a speaker and text.';
  }
  return null;
}
