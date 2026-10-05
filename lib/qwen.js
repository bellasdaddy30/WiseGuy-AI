// Talks to a Qwen3-TTS Space on Hugging Face.
//
// The Space is a copy of Qwen's own demo running under Chris's account
// (Moneynbanks/Qwen3-TTS). It runs the open Qwen3-TTS model on Hugging Face's
// free shared GPU, which has a small daily allowance, so every call here
// spends some of that allowance.
//
// A Space built with Gradio answers in three steps, and this file does all
// three:
//   1. POST the inputs. The Space replies with a ticket number (event_id).
//   2. Open the result stream for that ticket and wait. It sends "heartbeat"
//      lines while the job is queued or running, then "complete" or "error".
//   3. "complete" carries a link to the audio file. Download it.
//
// No Next.js imports in here on purpose: scripts/qwen-check.mjs runs this same
// file from the command line to test the real Space.

export const DEFAULT_QWEN_SPACE = 'Moneynbanks/Qwen3-TTS';

// Built-in voices, exactly as the Space's own dropdown lists them
export const QWEN_SPEAKERS = ['Aiden', 'Dylan', 'Eric', 'Ono_anna', 'Ryan', 'Serena', 'Sohee', 'Uncle_fu', 'Vivian'];
export const QWEN_MODEL_SIZES = ['0.6B', '1.7B'];
export const DEFAULT_QWEN_SPEAKER = 'Ryan';
export const DEFAULT_QWEN_MODEL_SIZE = '1.7B';

// "Moneynbanks/Qwen3-TTS" → "https://moneynbanks-qwen3-tts.hf.space".
// A full https:// address is used as given.
export function spaceBaseUrl(space = DEFAULT_QWEN_SPACE) {
  const s = String(space).trim();
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, '');
  const host = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `https://${host}.hf.space`;
}

// The result stream is plain text in blocks separated by blank lines:
//   event: complete
//   data: [ ... ]
function parseEvents(text) {
  const events = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    let event = '', data = '';
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (event) events.push({ event, data });
  }
  return events;
}

// Errors from this file carry enough for the caller to react sensibly:
//   err.quota   true when the daily GPU allowance is used up
//   err.status  the HTTP status, when the failure was an HTTP one
//   err.stage   which of the three steps failed: 'submit', 'wait' or 'download'
function fail(stage, message, extra = {}) {
  const err = new Error(message);
  err.stage = stage;
  err.quota = /quota/i.test(message);
  return Object.assign(err, extra);
}

function describe(data) {
  if (data == null || data === 'null' || data === '') return 'The Space reported an error with no details.';
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'string') return parsed;
    return parsed?.error || parsed?.message || parsed?.title || data;
  } catch {
    return data;
  }
}

// Low-level: run one named function on the Space and return its outputs.
// `onStep` is called with short progress notes, for the diagnostic script.
export async function callSpace({ space, token, apiName, inputs, signal, onStep = () => {} }) {
  const base = spaceBaseUrl(space);
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  let res;
  try {
    res = await fetch(`${base}/gradio_api/call/${apiName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ data: inputs }),
      signal,
    });
  } catch (err) {
    throw fail('submit', `Could not reach the Space: ${err.message}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw fail('submit', `The Space refused the request (HTTP ${res.status}). ${body.slice(0, 200)}`, { status: res.status });
  }
  const { event_id: eventId } = await res.json().catch(() => ({}));
  if (!eventId) throw fail('submit', 'The Space accepted the request but gave no ticket number.');
  onStep(`submitted, ticket ${eventId}`);

  let stream;
  try {
    stream = await fetch(`${base}/gradio_api/call/${apiName}/${eventId}`, { headers: auth, signal });
  } catch (err) {
    throw fail('wait', `Lost the connection while waiting: ${err.message}`);
  }
  if (!stream.ok) throw fail('wait', `Waiting for the result failed (HTTP ${stream.status}).`, { status: stream.status });

  // The stream closes itself once the job has finished, so reading it to the
  // end is the wait.
  const events = parseEvents(await stream.text());
  onStep(`events: ${events.map(e => e.event).join(', ') || 'none'}`);

  const error = events.find(e => e.event === 'error');
  if (error) throw fail('wait', describe(error.data));
  const complete = events.findLast(e => e.event === 'complete');
  if (!complete) throw fail('wait', 'The Space closed the connection without finishing.');

  let outputs;
  try { outputs = JSON.parse(complete.data); } catch { throw fail('wait', 'The Space sent a result that could not be read.'); }
  return { base, auth, outputs };
}

// Speak `text` in one of the built-in voices. Returns
//   { audio: ArrayBuffer, contentType, status, seconds }
// `instruct` is an optional plain-English note on how to say it, for example
// "tired and sarcastic". Leave it empty for the voice's normal delivery.
export async function qwenSpeak({
  space = DEFAULT_QWEN_SPACE,
  token = '',
  text,
  speaker = DEFAULT_QWEN_SPEAKER,
  instruct = '',
  language = 'English',
  modelSize = DEFAULT_QWEN_MODEL_SIZE,
  signal,
  onStep,
} = {}) {
  if (!text?.trim()) throw fail('submit', 'No text to speak.');
  if (!QWEN_SPEAKERS.includes(speaker)) throw fail('submit', `Unknown Qwen voice "${speaker}".`);
  if (!QWEN_MODEL_SIZES.includes(modelSize)) throw fail('submit', `Unknown Qwen model size "${modelSize}".`);

  const started = Date.now();
  // Order matters: it must match the Space's function signature
  //   generate_custom_voice(text, language, speaker, instruct, model_size)
  const { base, auth, outputs } = await callSpace({
    space, token, signal, onStep,
    apiName: 'generate_custom_voice',
    inputs: [text, language, speaker, instruct, modelSize],
  });

  const [file, status] = Array.isArray(outputs) ? outputs : [];
  // The Space returns no audio and a message in the status box when the model
  // itself fails, rather than raising an error.
  if (!file?.url && !file?.path) throw fail('wait', typeof status === 'string' && status ? status : 'The Space finished but returned no audio.');
  const url = file.url || `${base}/gradio_api/file=${file.path}`;

  let res;
  try {
    res = await fetch(url, { headers: auth, signal });
  } catch (err) {
    throw fail('download', `Could not download the audio: ${err.message}`);
  }
  if (!res.ok) throw fail('download', `Downloading the audio failed (HTTP ${res.status}).`, { status: res.status });

  return {
    audio: await res.arrayBuffer(),
    contentType: res.headers.get('content-type') || 'audio/wav',
    status: typeof status === 'string' ? status : '',
    seconds: (Date.now() - started) / 1000,
  };
}
