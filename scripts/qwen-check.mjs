#!/usr/bin/env node
// Checks that the app's Qwen code can really get speech out of your Qwen3-TTS
// Space, before anything in the app depends on it. It runs lib/qwen.js, the
// same file the app will use.
//
// Usage (no quotes needed):
//   node scripts/qwen-check.mjs
//   node scripts/qwen-check.mjs Aiden
//   node scripts/qwen-check.mjs Ryan 0.6B
//
// Each run makes ONE generation, which spends some of the Space's daily GPU
// allowance. It uses your Hugging Face login if you have one on this machine
// (`hf auth login`), so the allowance used is your account's. The token is
// read silently and never printed.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  qwenSpeak, spaceBaseUrl,
  DEFAULT_QWEN_SPACE, DEFAULT_QWEN_SPEAKER, DEFAULT_QWEN_MODEL_SIZE,
} from '../lib/qwen.js';

const speaker   = process.argv[2] || DEFAULT_QWEN_SPEAKER;
const modelSize = process.argv[3] || DEFAULT_QWEN_MODEL_SIZE;
const space     = process.env.QWEN_SPACE || DEFAULT_QWEN_SPACE;
const TEXT      = 'Hey there. WiseGuy AI at your service, and this is the Qwen voice test.';
const OUT_DIR   = join(homedir(), 'tts-samples');

function savedToken() {
  if (process.env.HF_TOKEN) return { token: process.env.HF_TOKEN.trim(), from: 'the HF_TOKEN variable' };
  const home = process.env.HF_HOME || join(homedir(), '.cache', 'huggingface');
  try {
    const token = readFileSync(join(home, 'token'), 'utf8').trim();
    if (token) return { token, from: 'your saved Hugging Face login' };
  } catch {}
  return { token: '', from: '' };
}

function wavSummary(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') return `not a wav file (starts with ${JSON.stringify(buf.toString('latin1', 0, 12))})`;
  let pos = 12, rate = 0, channels = 0, bits = 0, dataBytes = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') { channels = buf.readUInt16LE(pos + 10); rate = buf.readUInt32LE(pos + 12); bits = buf.readUInt16LE(pos + 22); }
    if (id === 'data') { dataBytes = Math.min(size, buf.length - pos - 8); break; }
    pos += 8 + size + (size % 2);
  }
  if (!rate || !dataBytes) return 'a wav file, but its header could not be read';
  const secs = dataBytes / (rate * channels * (bits / 8));
  return `wav, ${rate} Hz, ${channels} ch, ${bits}-bit, ${secs.toFixed(2)} s of audio`;
}

const { token, from } = savedToken();
const base = spaceBaseUrl(space);

console.log(`Space:   ${space}  (${base})`);
console.log(`Login:   ${token ? 'using ' + from : 'none found, calling as an anonymous visitor (smaller allowance)'}`);
console.log(`Request: voice ${speaker}, model ${modelSize}, ${TEXT.length} characters`);
console.log();

// 1. Is the Space awake and does it still have the function we call?
try {
  const res = await fetch(`${base}/gradio_api/info`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  console.log(`1. Space reachable: HTTP ${res.status}`);
  if (res.ok) {
    const info = await res.json();
    const names = Object.keys(info.named_endpoints || {});
    console.log(`   functions: ${names.join(', ') || 'none listed'}`);
    const fn = info.named_endpoints?.['/generate_custom_voice'];
    if (fn) console.log(`   generate_custom_voice inputs: ${fn.parameters.map(p => p.parameter_name).join(', ')}`);
    else console.log('   WARNING: generate_custom_voice is missing. The Space may have changed.');
  } else {
    console.log('   ' + (await res.text()).slice(0, 200));
  }
} catch (err) {
  console.log(`1. Space NOT reachable: ${err.message}`);
}
console.log();

// 2. One real generation
console.log('2. Generating (a cold Space can take a minute)…');
const started = Date.now();
try {
  const result = await qwenSpeak({
    space, token, text: TEXT, speaker, modelSize,
    onStep: note => console.log(`   +${((Date.now() - started) / 1000).toFixed(1)}s ${note}`),
  });
  const buf = Buffer.from(result.audio);
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `qwen-${speaker.toLowerCase()}.wav`);
  writeFileSync(file, buf);
  console.log(`   WORKED in ${result.seconds.toFixed(1)} s`);
  console.log(`   audio: ${buf.length} bytes, sent as ${result.contentType}, ${wavSummary(buf)}`);
  if (result.status) console.log(`   Space said: ${result.status}`);
  console.log(`   saved: ${file}`);
  console.log();
  console.log(`To listen:  ffplay -nodisp -autoexit ${file}`);
} catch (err) {
  console.log(`   FAILED after ${((Date.now() - started) / 1000).toFixed(1)} s at the "${err.stage || 'unknown'}" step`);
  console.log(`   ${err.message}`);
  if (err.quota) console.log('   That is the daily GPU allowance. It resets 24 hours after your first use.');
  process.exitCode = 1;
}
