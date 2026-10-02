// Whisper / shout markup shared by the chat display and every TTS provider.
//
// The AI writes [whispers] or [shouts] right before a phrase. The effect lasts
// until the next tag or the end of that sentence, whichever comes first.
// [normal] switches back early.

export const VOICE_TAG_INSTRUCTION =
  'Now and then, when it genuinely fits the moment, change your volume: put [whispers] right before a phrase you say quietly ' +
  '(secrets, asides, something sneaky) and [shouts] right before a phrase you yell (outrage, excitement, emphasis). ' +
  'The effect lasts until the end of that sentence. Write the tags exactly like that, in square brackets. ' +
  'Use them sparingly — at most one or two per reply, and many replies should have none.';

const TAG_RE = /\[(whispers|shouts|normal)\]\s*/gi;

// Split text into [{ style: 'normal' | 'whisper' | 'shout', text }].
export function splitVoiceSegments(text = '') {
  const segments = [];
  const push = (style, chunk) => {
    if (!chunk) return;
    const last = segments[segments.length - 1];
    if (last && last.style === style) last.text += chunk;
    else segments.push({ style, text: chunk });
  };

  // A tagged style runs to the end of its sentence; anything after is normal.
  const pushStyled = (style, chunk) => {
    if (style === 'normal') return push('normal', chunk);
    const end = chunk.search(/[.!?…](\s|$)/);
    if (end === -1) return push(style, chunk);
    const cut = end + 1;
    push(style, chunk.slice(0, cut));
    push('normal', chunk.slice(cut));
  };

  let style = 'normal';
  let pos = 0;
  for (const m of text.matchAll(TAG_RE)) {
    pushStyled(style, text.slice(pos, m.index));
    const tag = m[1].toLowerCase();
    style = tag === 'whispers' ? 'whisper' : tag === 'shouts' ? 'shout' : 'normal';
    pos = m.index + m[0].length;
  }
  pushStyled(style, text.slice(pos));
  return segments;
}

export function hasVoiceTags(text = '') {
  return splitVoiceSegments(text).some(s => s.style !== 'normal');
}

export function stripVoiceTags(text = '') {
  return splitVoiceSegments(text).map(s => s.text).join('');
}

// Rebuild the text with each provider's own tag names.
const PROVIDER_TAGS = {
  google:     { whisper: '[whispers] ', shout: '[shouting] ', normal: '[neutral] ' },
  elevenlabs: { whisper: '[whispers] ', shout: '[shouts] ',   normal: '' },
};

export function toProviderTags(text, provider) {
  const tags = PROVIDER_TAGS[provider];
  if (!tags) return stripVoiceTags(text);
  let prev = 'normal';
  return splitVoiceSegments(text).map(({ style, text: chunk }) => {
    const out = style !== 'normal' ? tags[style] + chunk
              : prev !== 'normal' && tags.normal ? ' ' + tags.normal + chunk.trimStart()
              : chunk;
    prev = style;
    return out;
  }).join('');
}
