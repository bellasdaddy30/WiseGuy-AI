#!/usr/bin/env node
// Diagnoses noise at the END of generated speech.
//
// Fetches a few clips from the app's /api/tts route, saves each one as a wav
// you can listen to, and prints what the last 1.5 seconds of each looks like
// as numbers: how loud, how "hissy", and whether there is a stray burst of
// sound after the voice has finished.
//
// Usage (no quotes needed):
//   node scripts/tts-tail.mjs
//   node scripts/tts-tail.mjs https://some-other-deployment.vercel.app
//
// Each run makes 4 requests to the Google voice.

import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE    = (process.argv[2] || 'https://wiseguy-ai.vercel.app').replace(/\/+$/, '');
const OUT_DIR = join(homedir(), 'tts-samples');

const PREVIEW_LINE = 'Hey there — WiseGuy AI at your service.';
const LONG_LINE =
  'Alright, here is a longer one. It has a couple of sentences in it, so we can see ' +
  'whether the noise shows up after a long clip the same way it does after a short one.';

const CASES = [
  // Exactly what the Settings Preview button sends
  { name: 'aoede-preview',  voice: 'Aoede',  text: PREVIEW_LINE },
  // A different voice, same words: is it the voice or the system?
  { name: 'charon-preview', voice: 'Charon', text: PREVIEW_LINE },
  // Longer text: short inputs are where speech models most often add junk
  { name: 'aoede-long',     voice: 'Aoede',  text: LONG_LINE },
  // Chat also sends a persona, which adds a speaking-style instruction
  { name: 'aoede-persona',  voice: 'Aoede',  text: PREVIEW_LINE, persona: 'wiseguy' },
];

const FRAME_MS  = 50;      // size of each row in the table
const TAIL_MS   = 1500;    // how much of the end to print
const SILENT_DB = -50;     // quieter than this counts as silence

const db = v => (v > 0 ? 20 * Math.log10(v) : -120);

function parseWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(pos + 8), channels: buf.readUInt16LE(pos + 10),
        rate: buf.readUInt32LE(pos + 12), bits: buf.readUInt16LE(pos + 22),
      };
    } else if (id === 'data') {
      data = { start: pos + 8, declared: size, actual: Math.min(size, buf.length - pos - 8) };
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (!fmt || !data) return null;
  return { fmt, data };
}

function analyse(name, buf) {
  const wav = parseWav(buf);
  if (!wav) { console.log('  Not a wav file. First bytes: ' + buf.subarray(0, 60).toString('latin1')); return; }
  const { fmt, data } = wav;
  console.log(`  format: ${fmt.rate} Hz, ${fmt.channels} ch, ${fmt.bits}-bit, type ${fmt.format}`);
  if (data.declared !== data.actual)
    console.log(`  WARNING: header says ${data.declared} bytes of audio but the file holds ${data.actual}`);
  if (fmt.bits !== 16 || fmt.format !== 1) { console.log('  Not 16-bit PCM; skipping the detailed look.'); return; }

  const n = Math.floor(data.actual / 2 / fmt.channels);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(data.start + i * 2 * fmt.channels) / 32768;
  const sr = fmt.rate, secs = n / sr;

  let sum = 0, peak = 0, dc = 0;
  for (let i = 0; i < n; i++) { sum += x[i] * x[i]; peak = Math.max(peak, Math.abs(x[i])); dc += x[i]; }
  console.log(`  length: ${secs.toFixed(2)} s   overall level: ${db(Math.sqrt(sum / n)).toFixed(1)} dB   peak: ${db(peak).toFixed(1)} dB   DC offset: ${(dc / n).toFixed(4)}`);
  console.log(`  first 3 samples: ${[...x.subarray(0, 3)].map(v => v.toFixed(4)).join(' ')}   last 3 samples: ${[...x.subarray(n - 3)].map(v => v.toFixed(4)).join(' ')}`);

  // Per-frame loudness and zero-crossing rate for the whole clip
  const frame = Math.round((sr * FRAME_MS) / 1000);
  const frames = [];
  for (let s = 0; s + frame <= n; s += frame) {
    let e = 0, zc = 0, jump = 0, clipped = 0;
    for (let i = s; i < s + frame; i++) {
      e += x[i] * x[i];
      if (i > s) {
        if ((x[i] >= 0) !== (x[i - 1] >= 0)) zc++;
        jump = Math.max(jump, Math.abs(x[i] - x[i - 1]));
      }
      if (Math.abs(x[i]) >= 0.999) clipped++;
    }
    frames.push({ t: s / sr, level: db(Math.sqrt(e / frame)), zcr: zc / (frame / sr), jump, clipped });
  }

  // Where does sound stop, and is the final sound an island after a gap?
  const loud = frames.map(f => f.level > SILENT_DB);
  let lastLoud = loud.lastIndexOf(true);
  if (lastLoud === -1) { console.log('  The whole clip is silent.'); return; }
  const trailingSilence = (frames.length - 1 - lastLoud) * FRAME_MS;
  let runStart = lastLoud;
  while (runStart > 0 && loud[runStart - 1]) runStart--;
  let gapStart = runStart;
  while (gapStart > 0 && !loud[gapStart - 1]) gapStart--;
  const lastRunMs = (lastLoud - runStart + 1) * FRAME_MS;
  const gapMs = (runStart - gapStart) * FRAME_MS;
  console.log(`  sound ends ${trailingSilence} ms before the end of the file`);
  console.log(`  final stretch of sound: ${lastRunMs} ms long, starting at ${frames[runStart].t.toFixed(2)} s, after ${gapMs} ms of silence`);

  // Typical speech numbers for this clip, for comparison with the tail
  const voiced = frames.filter(f => f.level > -35);
  const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };
  console.log(`  typical for this clip while speaking: level ${median(voiced.map(f => f.level)).toFixed(1)} dB, crossings ${Math.round(median(voiced.map(f => f.zcr)))}/s, biggest jump ${median(voiced.map(f => f.jump)).toFixed(3)}`);

  const tailFrames = frames.slice(-Math.round(TAIL_MS / FRAME_MS));
  console.log(`  last ${TAIL_MS} ms, one row per ${FRAME_MS} ms:`);
  console.log('    time(s)  level(dB)  crossings/s  biggest-jump  clipped  loudness');
  for (const f of tailFrames) {
    const bar = '#'.repeat(Math.max(0, Math.round((f.level + 60) / 2)));
    console.log(
      '    ' + f.t.toFixed(2).padStart(6) + '  ' + f.level.toFixed(1).padStart(8) + '  ' +
      String(Math.round(f.zcr)).padStart(10) + '  ' + f.jump.toFixed(3).padStart(11) + '  ' +
      String(f.clipped).padStart(7) + '  ' + bar
    );
  }
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`Testing ${BASE}/api/tts  (clips saved in ${OUT_DIR})\n`);

for (const c of CASES) {
  console.log(`=== ${c.name}: voice ${c.voice}${c.persona ? ', persona ' + c.persona : ''}, ${c.text.length} characters ===`);
  try {
    const started = Date.now();
    const res = await fetch(`${BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: c.text, provider: 'google', voice: c.voice, ...(c.persona && { persona: c.persona }) }),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`  HTTP ${res.status}, ${res.headers.get('content-type')}, ${buf.length} bytes, took ${((Date.now() - started) / 1000).toFixed(1)} s`);
    if (!res.ok) { console.log('  Server said: ' + buf.toString('utf8').slice(0, 300)); console.log(); continue; }
    const file = join(OUT_DIR, `${c.name}.wav`);
    writeFileSync(file, buf);
    console.log(`  saved: ${file}`);
    analyse(c.name, buf);
  } catch (err) {
    console.log('  Request failed: ' + (err?.message || err));
  }
  console.log();
}

console.log('Done. To listen to one:  ffplay -nodisp -autoexit ' + join(OUT_DIR, 'aoede-preview.wav'));
