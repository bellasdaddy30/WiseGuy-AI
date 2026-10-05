// Voice Tuning — reshapes a voice after it has been generated.
//
// What can be changed depends on who is doing the talking:
//
//   Google / ElevenLabs / OpenAI / Orpheus
//     The server sends back real audio, so the app owns the sound and can do
//     anything to it: speed, pitch, volume and a 5-band equalizer.
//
//   Browser
//     The phone or computer speaks directly. The app never receives the audio,
//     so there is nothing to filter. Only the three knobs the browser itself
//     exposes work: speed, pitch and volume. No equalizer is possible.
//
// Speed is stored separately under TTS_SPEED_KEY (lib/tts.js) because it
// already existed. Everything else lives in one JSON blob under VOICE_FX_KEY.

export const VOICE_FX_KEY = 'wiseguy_voice_fx';

export const SPEED_MIN   = 0.5;
export const SPEED_MAX   = 2.0;
export const PITCH_RANGE = 7;     // semitones up or down. 12 = one octave.
export const VOLUME_MAX  = 1.5;   // 150%
export const EQ_RANGE_DB = 12;    // each band can be cut or boosted this much

// Five bands chosen for what they do to a speaking voice, not for music.
export const EQ_BANDS = [
  { id: 'bass',     label: 'Bass',     hint: 'boom, chest',      type: 'lowshelf',  freq: 120 },
  { id: 'body',     label: 'Body',     hint: 'warmth, boxiness', type: 'peaking',   freq: 400,  q: 1.0 },
  { id: 'mid',      label: 'Mid',      hint: 'nasal, honk',      type: 'peaking',   freq: 1200, q: 1.0 },
  { id: 'presence', label: 'Presence', hint: 'clarity, bite',    type: 'peaking',   freq: 3000, q: 1.0 },
  { id: 'air',      label: 'Air',      hint: 'crispness, hiss',  type: 'highshelf', freq: 7000 },
];

export const DEFAULT_VOICE_FX = Object.freeze({
  pitch:  0,                  // semitones
  volume: 1,                  // 1 = 100%
  eq:     Object.freeze([0, 0, 0, 0, 0]),   // dB per band, same order as EQ_BANDS
});

// One-tap starting points. They set pitch and the equalizer only, so tapping
// one never changes the speed or volume you already picked.
export const VOICE_FX_PRESETS = [
  { id: 'original', label: 'Original', pitch:  0, eq: [  0,  0,  0,  0,  0] },
  { id: 'deep',     label: 'Deep',     pitch: -3, eq: [  5,  2,  0, -1, -3] },
  { id: 'warm',     label: 'Warm',     pitch: -1, eq: [  3,  3, -1, -2, -4] },
  { id: 'bright',   label: 'Bright',   pitch:  1, eq: [ -2, -1,  1,  4,  5] },
  { id: 'radio',    label: 'Radio',    pitch:  0, eq: [-10,  1,  7,  5, -9] },
  { id: 'chipmunk', label: 'Chipmunk', pitch:  6, eq: [ -4,  0,  0,  2,  2] },
  { id: 'giant',    label: 'Giant',    pitch: -6, eq: [  6,  2,  0,  0, -2] },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num   = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

// Accepts anything (old saved data, half a blob, garbage) and returns a
// complete, in-range settings object. Everything else in this file calls it,
// so a corrupt save can never produce NaN audio.
export function normalizeVoiceFx(raw) {
  const r  = raw && typeof raw === 'object' ? raw : {};
  const eq = Array.isArray(r.eq) ? r.eq : [];
  return {
    pitch:  clamp(num(r.pitch, 0), -PITCH_RANGE, PITCH_RANGE),
    volume: clamp(num(r.volume, 1), 0, VOLUME_MAX),
    eq:     EQ_BANDS.map((_, i) => clamp(num(eq[i], 0), -EQ_RANGE_DB, EQ_RANGE_DB)),
  };
}

export function clampSpeed(speed) {
  return clamp(num(speed, 1), SPEED_MIN, SPEED_MAX);
}

export function loadVoiceFx() {
  try {
    const raw = localStorage.getItem(VOICE_FX_KEY);
    return normalizeVoiceFx(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeVoiceFx(null);
  }
}

export function saveVoiceFx(fx) {
  try { localStorage.setItem(VOICE_FX_KEY, JSON.stringify(normalizeVoiceFx(fx))); } catch {}
}

// Semitones → frequency multiplier. +12 doubles the pitch, -12 halves it.
export function pitchRatio(semitones) {
  return Math.pow(2, num(semitones, 0) / 12);
}

// True when the equalizer and volume are untouched, i.e. the audio can go
// straight to the speakers with nothing in between.
export function isToneNeutral(fx) {
  const f = normalizeVoiceFx(fx);
  return Math.abs(f.volume - 1) < 0.005 && f.eq.every(db => Math.abs(db) < 0.05);
}

export function matchingPreset(fx) {
  const f = normalizeVoiceFx(fx);
  return VOICE_FX_PRESETS.find(p =>
    Math.abs(p.pitch - f.pitch) < 0.01 && p.eq.every((db, i) => Math.abs(db - f.eq[i]) < 0.01)
  )?.id ?? null;
}

// ── Browser voice ─────────────────────────────────────────────────────────
// Multipliers to apply on top of whatever rate/pitch/volume the caller was
// already going to use. The browser caps pitch and rate at 2 and volume at 1,
// so callers must clamp the final product.
export function browserVoiceParams(fx) {
  const f = normalizeVoiceFx(fx);
  return { pitch: pitchRatio(f.pitch), volume: f.volume };
}

// ── Changing speed without changing pitch ─────────────────────────────────
// Playing audio faster the simple way (playbackRate) also raises its pitch,
// like a record on the wrong speed. To separate the two, the audio is cut into
// short overlapping slices (40 ms) which are laid back down closer together
// or further apart. Before each slice is placed, a small search (±8 ms) finds
// the offset where it lines up best with the audio already written, so the
// voice's vibration stays continuous instead of buzzing. This is WSOLA
// (waveform-similarity overlap-add), the standard method for speech.
//
// channels: array of Float32Array, one per channel, all the same length.
// tempo:    2 = twice as fast (half as long), 0.5 = half speed.
// Returns new Float32Arrays, or the originals when no change is needed.
export function stretchChannels(channels, tempo, sampleRate) {
  const n = channels[0]?.length ?? 0;
  if (!(tempo > 0) || Math.abs(tempo - 1) < 0.01) return channels;

  const frame = Math.round(sampleRate * 0.04) & ~1;   // slice length, forced even
  const hop   = frame >> 1;                           // slices overlap by half
  if (n < frame * 2) return channels;                 // too short to slice

  const outTarget = Math.round(n / tempo);
  const frames    = Math.max(2, Math.round((outTarget - frame) / hop) + 1);
  const outLen    = (frames - 1) * hop + frame;
  const lastStart = n - frame;

  const search  = Math.round(sampleRate * 0.008);
  // The alignment search only has to resolve the voice's pitch period (4-12 ms),
  // so it looks at every few samples instead of all of them, and only at the
  // half of the slice that actually overlaps the previous one. This keeps the
  // work to a few tens of milliseconds per sentence, phone included.
  const sStep   = Math.max(1, Math.round(sampleRate / 8000));
  const lagStep = sStep;

  const ref = channels[0];
  const pos = new Int32Array(frames);
  let prev = 0;
  for (let k = 1; k < frames; k++) {
    // Where this slice would come from if we ignored alignment
    const nominal = Math.round((k * lastStart) / (frames - 1));
    // What the audio "wants" to play next: the continuation of the last slice
    const want = prev + hop;
    let best = clamp(nominal, 0, lastStart);

    if (want <= lastStart) {
      const lo = Math.max(-search, -nominal);
      const hi = Math.min(search, lastStart - nominal);
      let bestScore = -Infinity;
      for (let d = lo; d <= hi; d += lagStep) {
        const start = nominal + d;
        let xy = 0, xx = 0;
        for (let i = 0; i < hop; i += sStep) {
          const x = ref[start + i];
          xy += x * ref[want + i];
          xx += x * x;
        }
        const score = xy / Math.sqrt(xx + 1e-9);
        if (score > bestScore) { bestScore = score; best = start; }
      }
    }
    pos[k] = best;
    prev   = best;
  }

  // Raised-cosine window: two neighbours overlapped by half always add up to 1,
  // so the loudness stays constant across the joins.
  const win = new Float32Array(frame);
  for (let i = 0; i < frame; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame);

  return channels.map(src => {
    const out = new Float32Array(outLen);
    for (let k = 0; k < frames; k++) {
      const from = pos[k], to = k * hop;
      for (let i = 0; i < frame; i++) {
        // The very first and very last half-slices have no neighbour to blend
        // with, so they are copied at full strength instead of faded.
        const edge = (k === 0 && i < hop) || (k === frames - 1 && i >= hop);
        out[to + i] += src[from + i] * (edge ? 1 : win[i]);
      }
    }
    return out;
  });
}

// ── Equalizer + volume ────────────────────────────────────────────────────
// Boosting bass or volume can push the signal past full scale, which the
// speaker turns into harsh crackle. The last stage is a soft clipper: audio
// below 80% of full scale passes through untouched, anything above is rounded
// off smoothly instead of chopped.
const HEADROOM = 4;   // the clipper stays well-behaved up to 4x full scale (+12 dB)
let clipCurve  = null;
function softClipCurve() {
  if (clipCurve) return clipCurve;
  const size = 8193, knee = 0.8;
  clipCurve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = ((i / (size - 1)) * 2 - 1) * HEADROOM;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
    clipCurve[i] = Math.sign(x) * y;
  }
  return clipCurve;
}

// Wires: source → 5 filters → volume → soft clipper → speakers.
// Returns update(fx) so sliders can change the sound while it is playing.
function connectToneChain(ctx, source, fx) {
  const f = normalizeVoiceFx(fx);
  const filters = EQ_BANDS.map((band, i) => {
    const node = ctx.createBiquadFilter();
    node.type = band.type;
    node.frequency.value = band.freq;
    if (band.q) node.Q.value = band.q;
    node.gain.value = f.eq[i];
    return node;
  });
  const volume = ctx.createGain();
  volume.gain.value = f.volume;
  const pre = ctx.createGain();
  pre.gain.value = 1 / HEADROOM;          // scale into the clipper's input range
  const clip = ctx.createWaveShaper();
  clip.curve = softClipCurve();

  const nodes = [source, ...filters, volume, pre, clip];
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  clip.connect(ctx.destination);

  return {
    update(next) {
      const g = normalizeVoiceFx(next);
      const t = ctx.currentTime;
      // Glide to the new value over ~20 ms so dragging a slider doesn't click
      filters.forEach((node, i) => node.gain.setTargetAtTime(g.eq[i], t, 0.02));
      volume.gain.setTargetAtTime(g.volume, t, 0.02);
    },
    disconnect() {
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    },
  };
}

// ── Play a decoded voice clip with tuning applied ─────────────────────────
// ctx:         an AudioContext that has already been unlocked by a tap
// audioBuffer: what ctx.decodeAudioData() returned
// options:
//   speed    talking speed, 1 = normal
//   fx       tuning settings (pitch, volume, eq)
//   onended  called once when playback finishes or is stopped
//   live     keep the equalizer wired in even when it is flat, so update()
//            can change it mid-playback. Settings page only.
//
// With speed 1 and tuning at defaults this plays the clip exactly as it
// arrived: no slicing, no filters, source wired straight to the speakers.
export function playTuned(ctx, audioBuffer, { speed = 1, fx, onended, live = false } = {}) {
  const f     = normalizeVoiceFx(fx);
  const ratio = pitchRatio(f.pitch);
  // Pitch is changed by playing the clip faster or slower (playbackRate).
  // That also changes how long it lasts, so the clip is first stretched the
  // opposite way. Net effect: pitch moves by `ratio`, speed moves by `speed`.
  const tempo = clampSpeed(speed) / ratio;

  let buffer = audioBuffer;
  if (Math.abs(tempo - 1) >= 0.01) {
    const channels = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c));
    const stretched = stretchChannels(channels, tempo, audioBuffer.sampleRate);
    if (stretched !== channels) {
      buffer = ctx.createBuffer(stretched.length, stretched[0].length, audioBuffer.sampleRate);
      stretched.forEach((data, c) => buffer.getChannelData(c).set(data));
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = ratio;

  let chain = null;
  if (live || !isToneNeutral(f)) chain = connectToneChain(ctx, source, f);
  else source.connect(ctx.destination);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    chain?.disconnect();
    onended?.();
  };
  source.onended = finish;
  source.start(0);

  return {
    source,
    update(next) { chain?.update(next); },
    stop() {
      try { source.stop(); } catch {}
      finish();
    },
  };
}
