// Voice input that does not depend on the browser's built-in speech
// recognition (webkitSpeechRecognition).
//
// Why this exists: on iPhone, Safari's speech recognition is NOT available to
// web apps added to the Home Screen. It fails with "service-not-allowed" no
// matter what the microphone permission says (WebKit bug 225298). It can also
// refuse to restart without a fresh tap, which breaks hands-free mode.
//
// This path records the microphone directly (getUserMedia + MediaRecorder,
// which do work in Home Screen apps), detects when you stop talking, and sends
// the clip to /api/transcribe (Whisper on Groq).

export function canRecord() {
  return typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';
}

export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// True when running as an installed Home Screen app.
export function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function openMic() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

export function closeMic(stream) {
  stream?.getTracks().forEach(t => t.stop());
}

function pickMimeType() {
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

// Records one utterance from an already-open mic stream.
//
// ctx: an AudioContext (used only to measure loudness)
// options:
//   silenceMs     stop this long after the speaker goes quiet
//   noSpeechMs    give up if nobody starts talking within this long
//   maxMs         hard cap on one recording
//   onSpeechStart called once when speech is first detected
//
// Returns { promise, stop, abort }.
//   promise resolves to a Blob, or null when nothing was said / aborted.
//   stop()  ends now and keeps what was recorded.
//   abort() ends now and throws it away.
export function recordUtterance(stream, ctx, {
  silenceMs = 1200, noSpeechMs = 8000, maxMs = 30000, onSpeechStart,
} = {}) {
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };

  let analyser = null, source = null;
  try {
    source   = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);           // measure only — never to the speakers
  } catch { /* no level meter: fall back to timers only */ }

  const samples = new Float32Array(analyser?.fftSize ?? 0);
  const started = Date.now();
  let heardSpeech = false, lastLoud = 0, floor = 0.01, keep = true, timer = null;

  let finish;
  const promise = new Promise(resolve => { finish = resolve; });

  function level() {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  function end(keepAudio) {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
    keep = keepAudio;
    try { source?.disconnect(); } catch {}
    if (recorder.state !== 'inactive') recorder.stop();
    else finish(null);
  }

  recorder.onstop = () => {
    if (!keep || !heardSpeech || !chunks.length) return finish(null);
    finish(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/mp4' }));
  };

  recorder.start(250);
  timer = setInterval(() => {
    const now = Date.now();
    const rms = level();
    // Track the room's background level while nobody is talking.
    if (!heardSpeech) floor = floor * 0.9 + rms * 0.1;
    const loud = rms > Math.max(0.02, floor * 3);
    if (loud) {
      lastLoud = now;
      if (!heardSpeech) { heardSpeech = true; onSpeechStart?.(); }
    }
    if (!analyser && now - started > 1500) heardSpeech = true; // can't measure: assume speech
    if (heardSpeech && analyser && now - lastLoud > silenceMs) return end(true);
    if (!heardSpeech && now - started > noSpeechMs) return end(false);
    if (now - started > maxMs) return end(true);
  }, 50);

  return {
    promise,
    stop:  () => { heardSpeech = true; end(true); },
    abort: () => end(false),
  };
}

// Sends a recording to the server and returns the text ('' if none).
export async function transcribe(blob) {
  const ext = /webm/.test(blob.type) ? 'webm' : /aac/.test(blob.type) ? 'aac' : 'm4a';
  const form = new FormData();
  form.append('file', blob, `speech.${ext}`);
  const res = await fetch('/api/transcribe', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status}).`);
  return (data.text ?? '').trim();
}
