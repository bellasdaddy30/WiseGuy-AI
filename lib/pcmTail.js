// Removes the burst of junk Google's voice sometimes adds after it has
// finished speaking.
//
// What it looks like (measured from a real clip with scripts/tts-tail.mjs):
// the voice finishes, there is about 300 ms of silence, then roughly 100 ms of
// full-volume digital noise that runs right up to the last sample. Played
// back, that is the "scratched record" sound at the end of a reply.
//
// The check is deliberately strict, because cutting a real last word would be
// worse than leaving a noise in. All three of these must be true:
//
//   1. The final stretch of sound comes after a clear silence (150 ms or more).
//   2. That final stretch is short (500 ms or less).
//   3. It is harsh in a way speech is not: neighbouring samples leap across
//      most of the full range, or samples are pinned at maximum.
//
// A normal ending such as "Sure, why not." passes tests 1 and 2 but fails 3,
// so it is left alone.
//
// Input and output are raw 16-bit little-endian mono PCM, which is what the
// Google voice returns.

const FRAME_MS     = 10;
const SILENT_DB    = -45;   // quieter than this counts as silence
const MIN_GAP_MS   = 150;   // silence needed before the final stretch
const MAX_BURST_MS = 500;   // anything longer is treated as real speech
const KEEP_GAP_MS  = 150;   // how much of the silence to keep as a natural ending
const HARSH_JUMP   = 0.7;   // sample-to-sample leap, where full range is 2.0
const HARSH_RATIO  = 2.5;   // ...and this many times the clip's normal leap
const CLIP_LEVEL   = 32760; // of 32767

// Returns { pcm, info }.
//   pcm   the same bytes, shortened if a burst was removed (a view, not a copy)
//   info  null when the ending looks ordinary. Otherwise the measurements,
//         with info.trimmed saying whether anything was cut. Worth logging.
export function trimTrailingBurst(pcm, sampleRate) {
  const total = pcm.length >> 1;                       // whole 16-bit samples
  const frame = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000));
  const frames = Math.floor(total / frame);
  if (frames < 10) return { pcm, info: null };

  const view = new DataView(pcm.buffer, pcm.byteOffset, total * 2);
  const level   = new Float32Array(frames);            // dB
  const jump    = new Float32Array(frames);            // biggest leap, full range = 2.0
  const clipped = new Uint16Array(frames);

  let prev = view.getInt16(0, true);
  for (let f = 0; f < frames; f++) {
    let energy = 0, maxJump = 0, clips = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) {
      const s = view.getInt16(i * 2, true);
      energy += s * s;
      const d = Math.abs(s - prev);
      if (d > maxJump) maxJump = d;
      if (s >= CLIP_LEVEL || s <= -CLIP_LEVEL) clips++;
      prev = s;
    }
    const rms = Math.sqrt(energy / frame) / 32768;
    level[f]   = rms > 0 ? 20 * Math.log10(rms) : -120;
    jump[f]    = maxJump / 32768;
    clipped[f] = clips;
  }

  // Walk back from the end: trailing silence, then the final stretch of sound,
  // then the silence before it.
  let last = frames - 1;
  while (last >= 0 && level[last] <= SILENT_DB) last--;
  if (last < 0) return { pcm, info: null };            // the whole clip is silent

  let burstStart = last;
  while (burstStart > 0 && level[burstStart - 1] > SILENT_DB) burstStart--;
  let gapStart = burstStart;
  while (gapStart > 0 && level[gapStart - 1] <= SILENT_DB) gapStart--;

  const gapMs   = (burstStart - gapStart) * FRAME_MS;
  const burstMs = (last - burstStart + 1) * FRAME_MS;
  // No silence before it, or nothing spoken before that silence: ordinary ending.
  if (gapMs < MIN_GAP_MS || gapStart === 0) return { pcm, info: null };

  // What a normal leap looks like in the spoken part of this clip
  const speechJumps = [];
  for (let f = 0; f < gapStart; f++) if (level[f] > -35) speechJumps.push(jump[f]);
  speechJumps.sort((a, b) => a - b);
  const normalJump = speechJumps.length ? speechJumps[speechJumps.length >> 1] : 0;

  let burstJump = 0, burstClips = 0;
  for (let f = burstStart; f <= last; f++) {
    if (jump[f] > burstJump) burstJump = jump[f];
    burstClips += clipped[f];
  }

  const harsh = burstJump >= Math.max(HARSH_JUMP, HARSH_RATIO * normalJump) || burstClips >= 2;
  const trimmed = burstMs <= MAX_BURST_MS && harsh;

  const info = {
    trimmed,
    clipMs: Math.round((total / sampleRate) * 1000),
    gapMs,
    burstMs,
    burstJump: +burstJump.toFixed(3),
    normalJump: +normalJump.toFixed(3),
    burstClips,
  };
  if (!trimmed) return { pcm, info };

  // Cut inside the silence, keeping a little of it so the ending isn't abrupt
  const keepFrames = Math.min(burstStart - gapStart, Math.round(KEEP_GAP_MS / FRAME_MS));
  const endSample  = (gapStart + keepFrames) * frame;
  info.removedMs   = Math.round(((total - endSample) / sampleRate) * 1000);
  return { pcm: pcm.subarray(0, endSample * 2), info };
}
