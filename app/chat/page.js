'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from '../../components/ChatMessage';
import HistorySidebar from '../../components/HistorySidebar';
import { MODELS, DEFAULT_MODEL, MODEL_KEY } from '../../lib/models';
import { DEFAULT_PERSONALITY, PERSONALITY_KEY } from '../../lib/personality';
import { getMemory } from '../../lib/memory';
import { loadHistory, saveConversation, deleteConversation, makeConvId, convTitle } from '../../lib/history';
import {
  stripMarkdown, truncateForTts, nextVoice, findSpeechCut,
  BROWSER_SEGMENT_STYLE,
  GOOGLE_VOICES, ELEVENLABS_VOICES, OPENAI_VOICES, ORPHEUS_VOICES, PERSONA_BROWSER_TTS,
  TTS_PROVIDER_KEY, TTS_SPEED_KEY,
  TTS_VOICE_GOOGLE_KEY, TTS_VOICE_ELEVENLABS_KEY, TTS_VOICE_OPENAI_KEY, TTS_VOICE_ORPHEUS_KEY,
  TTS_VOICE_QWEN_KEY, TTS_QWEN_STYLE_KEY, DEFAULT_QWEN_VOICE, QWEN_VOICES,
  DEFAULT_TTS_PROVIDER, DEFAULT_GOOGLE_VOICE, DEFAULT_ELEVENLABS_VOICE, DEFAULT_OPENAI_VOICE, DEFAULT_ORPHEUS_VOICE,
  DEFAULT_TTS_SPEED,
  VOICE_MODE_KEY, AI_VOICE_KEY, HANDS_FREE_KEY,
} from '../../lib/tts';
import { splitVoiceSegments, toProviderTags } from '../../lib/voiceTags';
import { DEFAULT_VOICE_FX, loadVoiceFx, browserVoiceParams, playTuned } from '../../lib/voicefx';
import { canRecord, isIOS, isStandalone, openMic, closeMic, recordUtterance, transcribe } from '../../lib/micRecorder';
import styles from './chat.module.css';

const ERROR_REPLY = "The AI service isn't responding right now.";

const TTS_PROVIDERS = ['browser', 'google', 'elevenlabs', 'openai', 'orpheus', 'qwen'];
const TTS_LABELS    = { browser: 'Browser', google: 'Google', elevenlabs: 'ELabs', openai: 'OpenAI', orpheus: 'Orpheus', qwen: 'Qwen' };

export default function ChatPage() {
  const [messages, setMessages]         = useState([
    { role: 'assistant', content: "Oh good, you're here. Ask me something." },
  ]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [model, setModel]               = useState(DEFAULT_MODEL);
  const [personality, setPersonality]   = useState(DEFAULT_PERSONALITY);
  const [listening, setListening]       = useState(false);
  const [voiceMode, setVoiceMode]       = useState('review');
  const [aiVoice, setAiVoice]           = useState(false);
  const [handsFree, setHandsFree]       = useState(false);
  const [ttsProvider, setTtsProvider]   = useState(DEFAULT_TTS_PROVIDER);
  const [googleVoice, setGoogleVoice]   = useState(DEFAULT_GOOGLE_VOICE);
  const [elVoice, setElVoice]           = useState(DEFAULT_ELEVENLABS_VOICE);
  const [elVoices, setElVoices]         = useState(ELEVENLABS_VOICES);
  const [oaVoice, setOaVoice]           = useState(DEFAULT_OPENAI_VOICE);
  const [orVoice, setOrVoice]           = useState(DEFAULT_ORPHEUS_VOICE);
  const [qwVoice, setQwVoice]           = useState(DEFAULT_QWEN_VOICE);
  const [micError, setMicError]         = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [convHistory, setConvHistory]   = useState([]);
  const [alwaysOn, setAlwaysOn]         = useState(false);
  const [micMuted, setMicMuted]         = useState(false);
  const [ttsSpeed, setTtsSpeed]         = useState(DEFAULT_TTS_SPEED);

  const convIdRef      = useRef(null);
  const convCreatedRef = useRef(null);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef  = useRef('');
  const audioRef       = useRef(null);
  const audioCtxRef    = useRef(null);
  const sourceNodeRef  = useRef(null);
  const speechRef      = useRef(null);
  const voiceCooldownRef = useRef({}); // provider -> timestamp until which it's skipped
  // Refs so async closures always see current values
  const voiceModeRef   = useRef(voiceMode);
  const aiVoiceRef     = useRef(aiVoice);
  const handsFreeModeRef = useRef(handsFree);
  const ttsProviderRef = useRef(ttsProvider);
  const googleVoiceRef = useRef(googleVoice);
  const elVoiceRef     = useRef(elVoice);
  const oaVoiceRef     = useRef(oaVoice);
  const orVoiceRef     = useRef(orVoice);
  const qwVoiceRef     = useRef(qwVoice);
  const qwStyleRef     = useRef('');   // Qwen's "how to say it" note from Settings
  const ttsSpeedRef         = useRef(DEFAULT_TTS_SPEED);
  // Voice Tuning from Settings (pitch, volume, equalizer). Read once on load.
  const voiceFxRef          = useRef(DEFAULT_VOICE_FX);
  const loadingRef          = useRef(loading);
  const messagesRef         = useRef(messages);
  const alwaysOnRef         = useRef(false);
  const micMutedRef         = useRef(false);
  const continuousActiveRef = useRef(false);
  const submitTextRef       = useRef(null);
  // Recorder-based voice input (see lib/micRecorder.js)
  const micStreamRef        = useRef(null);
  const srBrokenRef         = useRef(false); // Safari speech recognition refused; use the recorder

  useEffect(() => { voiceModeRef.current     = voiceMode;   }, [voiceMode]);
  useEffect(() => { aiVoiceRef.current       = aiVoice;     }, [aiVoice]);
  useEffect(() => { handsFreeModeRef.current = handsFree;   }, [handsFree]);
  useEffect(() => { ttsProviderRef.current   = ttsProvider; }, [ttsProvider]);
  useEffect(() => { googleVoiceRef.current   = googleVoice; }, [googleVoice]);
  useEffect(() => { elVoiceRef.current       = elVoice;     }, [elVoice]);
  useEffect(() => { oaVoiceRef.current       = oaVoice;     }, [oaVoice]);
  useEffect(() => { orVoiceRef.current       = orVoice;     }, [orVoice]);
  useEffect(() => { qwVoiceRef.current       = qwVoice;     }, [qwVoice]);
  useEffect(() => { ttsSpeedRef.current      = ttsSpeed;    }, [ttsSpeed]);
  useEffect(() => { loadingRef.current       = loading;     }, [loading]);
  useEffect(() => { messagesRef.current      = messages;    }, [messages]);
  useEffect(() => { alwaysOnRef.current      = alwaysOn;   }, [alwaysOn]);
  useEffect(() => { micMutedRef.current      = micMuted;   }, [micMuted]);

  // Release the microphone when leaving the page.
  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    closeMic(micStreamRef.current);
    micStreamRef.current = null;
  }, []);

  useEffect(() => {
    // Load conversation history
    const hist = loadHistory();
    setConvHistory(hist);
    if (hist.length > 0) {
      const latest = hist[0];
      convIdRef.current      = latest.id;
      convCreatedRef.current = latest.created;
      setMessages(latest.messages);
    } else {
      convIdRef.current      = makeConvId();
      convCreatedRef.current = Date.now();
    }

    try {
      const m  = localStorage.getItem(MODEL_KEY);
      // Clear stale model selection (retired model or old Ollama choice)
      if (m && MODELS.some(x => x.id === m)) {
        setModel(m);
      } else if (m) {
        localStorage.removeItem(MODEL_KEY); // stale ID — fall back to new default
      }
      const p  = localStorage.getItem(PERSONALITY_KEY);
      if (p) setPersonality({ ...DEFAULT_PERSONALITY, ...JSON.parse(p) });
      const vm = localStorage.getItem(VOICE_MODE_KEY);
      if (vm === 'auto' || vm === 'review') setVoiceMode(vm);
      const av = localStorage.getItem(AI_VOICE_KEY);
      if (av !== null) setAiVoice(av === 'true');
      const hf = localStorage.getItem(HANDS_FREE_KEY);
      if (hf !== null) setHandsFree(hf === 'true');
      const tp = localStorage.getItem(TTS_PROVIDER_KEY);
      if (TTS_PROVIDERS.includes(tp)) {
        setTtsProvider(tp);
        if (tp === 'elevenlabs') fetchElVoices();
      }
      const gv = localStorage.getItem(TTS_VOICE_GOOGLE_KEY);
      if (gv && GOOGLE_VOICES.some(v => v.id === gv)) setGoogleVoice(gv);
      const ev = localStorage.getItem(TTS_VOICE_ELEVENLABS_KEY);
      if (ev && ELEVENLABS_VOICES.some(v => v.id === ev)) setElVoice(ev);
      const ov = localStorage.getItem(TTS_VOICE_OPENAI_KEY);
      if (ov && OPENAI_VOICES.some(v => v.id === ov)) setOaVoice(ov);
      const rv = localStorage.getItem(TTS_VOICE_ORPHEUS_KEY);
      if (rv && ORPHEUS_VOICES.some(v => v.id === rv)) setOrVoice(rv);
      const qv = localStorage.getItem(TTS_VOICE_QWEN_KEY);
      if (qv && QWEN_VOICES.some(v => v.id === qv)) setQwVoice(qv);
      qwStyleRef.current = localStorage.getItem(TTS_QWEN_STYLE_KEY) || '';
      const spd = parseFloat(localStorage.getItem(TTS_SPEED_KEY));
      if (spd > 0) { setTtsSpeed(spd); ttsSpeedRef.current = spd; }
      voiceFxRef.current = loadVoiceFx();
    } catch {}
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function unlockAudioContext() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      // iOS Safari requires an actual sound played in the gesture handler to unlock
      // the audio session — just creating/resuming the context isn't enough.
      // A 1-sample silent buffer is inaudible but satisfies the requirement.
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {}
  }

  function stopAudio() {
    const q = speechRef.current;
    if (q) { q.cancelled = true; q.resolveCurrent?.(); speechRef.current = null; }
    try { if (sourceNodeRef.current) { sourceNodeRef.current.stop(); sourceNodeRef.current = null; } } catch {}
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
  }

  // ── Always-on continuous listening loop ───────────────────────────────────
  // Restarts itself after each utterance. Submits when SR fires onend with text.
  // Pauses while loading so we don't queue a second message mid-response.
  // Detects speech during AI audio playback and cuts the audio (interrupt).
  function runContinuousListening() {
    if (!continuousActiveRef.current || micMutedRef.current) return;
    if (loadingRef.current) {
      // AI is still fetching/streaming — check back and restart once it's done
      setTimeout(() => runContinuousListening(), 600);
      return;
    }

    if (shouldRecord()) {
      // Don't record the AI's own voice: wait until it has finished speaking.
      if (speechRef.current) { setTimeout(() => runContinuousListening(), 400); return; }
      startRecorderListening({ continuous: true }).then(ok => {
        if (ok !== false && continuousActiveRef.current && !micMutedRef.current) {
          setTimeout(() => runContinuousListening(), 300);
        }
      });
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous     = false; // one utterance per session; auto-restart keeps it going
    rec.interimResults = true;
    rec.lang           = 'en-US';

    let sessionTranscript = '';

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      sessionTranscript = t;
      transcriptRef.current = t;
      setInput(t);
      // Cut the AI's audio the moment the user starts speaking
      if (t.trim() && speechRef.current) stopAudio();
    };

    rec.onend = () => {
      setListening(false);
      const final = sessionTranscript.trim();
      sessionTranscript = '';
      transcriptRef.current = '';
      if (final && !loadingRef.current) {
        // Use the ref so we always get the latest version of submitText
        (submitTextRef.current ?? submitText)(final);
        setInput('');
      } else {
        setInput('');
      }
      if (continuousActiveRef.current) setTimeout(() => runContinuousListening(), 400);
    };

    rec.onerror = (e) => {
      setListening(false);
      if ((e.error === 'not-allowed' || e.error === 'service-not-allowed') && canRecord() && !srBrokenRef.current) {
        // Safari refused (Home Screen app, or a restart without a tap).
        // Switch to the recorder and keep going instead of giving up.
        srBrokenRef.current = true;
        if (continuousActiveRef.current) setTimeout(() => runContinuousListening(), 300);
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        continuousActiveRef.current = false;
        setAlwaysOn(false);
        const msg = srErrorMessage(e.error, detectIOS());
        if (msg) { setMicError(msg); setTimeout(() => setMicError(''), 6000); }
        return;
      }
      // 'no-speech', 'aborted' — restart silently; other errors show a message
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        const msg = srErrorMessage(e.error, detectIOS());
        if (msg) { setMicError(msg); setTimeout(() => setMicError(''), 5000); }
      }
      if (continuousActiveRef.current) setTimeout(() => runContinuousListening(), 500);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      if (continuousActiveRef.current) setTimeout(() => runContinuousListening(), 500);
    }
  }

  function toggleAlwaysOn() {
    const next = !alwaysOnRef.current;
    setAlwaysOn(next);
    alwaysOnRef.current = next;
    if (next) {
      unlockAudioContext();
      // Auto-enable AI voice when entering always-on mode
      if (!aiVoiceRef.current) {
        setAiVoice(true);
        aiVoiceRef.current = true;
        try { localStorage.setItem(AI_VOICE_KEY, 'true'); } catch {}
      }
      setMicMuted(false);
      micMutedRef.current = false;
      continuousActiveRef.current = true;
      runContinuousListening();
    } else {
      continuousActiveRef.current = false;
      recognitionRef.current?.abort?.();
      setListening(false);
      setMicMuted(false);
      micMutedRef.current = false;
      closeMic(micStreamRef.current);
      micStreamRef.current = null;
    }
  }

  function toggleMicMuted() {
    const next = !micMutedRef.current;
    setMicMuted(next);
    micMutedRef.current = next;
    if (next) {
      recognitionRef.current?.abort?.();
      setListening(false);
    } else {
      runContinuousListening();
    }
  }

  // Detects iOS/iPadOS including iPads that report a Mac user-agent in desktop mode
  function detectIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function srErrorMessage(error, isIOS) {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return isIOS
          ? 'Mic blocked. Go to Settings → Safari → Microphone, allow this site, then reload the page and try again.'
          : 'Mic blocked. Click the lock icon in your browser address bar and allow the microphone.';
      case 'network':
        return 'Voice input requires HTTPS — use the wiseguy-ai.vercel.app URL, not localhost.';
      case 'audio-capture':
        return 'Microphone not found or it\'s in use by another app.';
      case 'no-speech':
        return null; // not an error — user just didn't speak
      default:
        return `Voice error (${error}). Make sure you\'re in Safari on iOS with HTTPS.`;
    }
  }

  // startListening is defined here so the speech queue can call it after audio ends
  // Safari's speech recognition can't be used in an iPhone Home Screen app,
  // and isn't in every browser. In those cases record and transcribe instead.
  function shouldRecord() {
    if (!canRecord()) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !SR || srBrokenRef.current || (isIOS() && isStandalone());
  }

  // Record one utterance, transcribe it, and (in auto / hands-free / always-on)
  // send it. Returns false when the mic can't be opened at all.
  async function startRecorderListening({ continuous = false } = {}) {
    if (loadingRef.current) return true;
    if (!continuous) stopAudio();
    setMicError('');
    unlockAudioContext();
    const ctx = audioCtxRef.current;

    let stream = micStreamRef.current;
    if (!stream || stream.getAudioTracks().every(t => t.readyState === 'ended')) {
      try {
        stream = await openMic();
        micStreamRef.current = stream;
      } catch {
        setMicError(detectIOS()
          ? 'Mic blocked. iPhone Settings → Privacy & Security → Microphone, and Settings → Safari → Microphone → Allow. Then reload.'
          : 'Mic blocked. Click the lock icon in your address bar and allow the microphone.');
        setTimeout(() => setMicError(''), 8000);
        if (continuous) { continuousActiveRef.current = false; setAlwaysOn(false); }
        return false;
      }
    }

    const handle = recordUtterance(stream, ctx, { noSpeechMs: continuous ? 15000 : 8000 });
    recognitionRef.current = handle;
    setListening(true);
    const blob = await handle.promise;
    if (recognitionRef.current === handle) recognitionRef.current = null;
    setListening(false);

    // One-off tap: let go of the mic so the recording indicator goes away.
    const keepOpen = continuous || handsFreeModeRef.current;
    if (!keepOpen) { closeMic(micStreamRef.current); micStreamRef.current = null; }
    if (!blob) return true;

    setInput('Transcribing…');
    let text = '';
    try {
      text = await transcribe(blob);
    } catch (err) {
      setInput('');
      setMicError(err.message);
      setTimeout(() => setMicError(''), 6000);
      return true;
    }
    if (text && (continuous || voiceModeRef.current === 'auto' || handsFreeModeRef.current)) {
      setInput('');
      (submitTextRef.current ?? submitText)(text);
    } else {
      setInput(text);
    }
    return true;
  }

  function startListening({ auto = false } = {}) {
    const isIOS = detectIOS();
    if (shouldRecord()) { startRecorderListening(); return; }
    const SR    = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError(isIOS
        ? 'Voice input only works in Safari on iOS — open this page in Safari.'
        : 'Voice input not supported in this browser.'
      );
      setTimeout(() => setMicError(''), 5000);
      return;
    }
    if (loadingRef.current) return;
    stopAudio();
    setMicError('');

    // Create the SR instance synchronously while the user-gesture context is
    // still active. iOS Safari drops gesture context as soon as we go async,
    // so rec.start() must be called synchronously on iOS.
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = 'en-US';
    transcriptRef.current = '';

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      transcriptRef.current = t;
      setInput(t);
    };
    rec.onend = () => {
      setListening(false);
      const final = transcriptRef.current.trim();
      if (final && (voiceModeRef.current === 'auto' || handsFreeModeRef.current)) {
        submitText(final);
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      if ((e.error === 'service-not-allowed' || (auto && e.error === 'not-allowed')) && canRecord()) {
        // Safari refused speech recognition. That is not a mic-permission
        // problem, so switch to recording instead of blaming the permission.
        srBrokenRef.current = true;
        if (auto) { startRecorderListening(); return; }
        setMicError('Switched to cloud voice input. Tap the mic again.');
        setTimeout(() => setMicError(''), 5000);
        return;
      }
      const msg = srErrorMessage(e.error, isIOS);
      if (msg) { setMicError(msg); setTimeout(() => setMicError(''), 6000); }
    };

    function beginRecognition() {
      try {
        rec.start();
        recognitionRef.current = rec;
        setListening(true);
      } catch (err) {
        setMicError(isIOS
          ? 'Mic failed to start. Make sure you\'re in Safari and the mic is allowed in Settings.'
          : `Voice input failed to start: ${err?.message ?? 'unknown error'}`
        );
        setTimeout(() => setMicError(''), 6000);
      }
    }

    // iOS/iPadOS: call rec.start() synchronously — the SR API handles its own
    // permission flow and calling getUserMedia first breaks the gesture context.
    if (isIOS || !navigator.mediaDevices?.getUserMedia) {
      beginRecognition();
    } else {
      // Android / Desktop: getUserMedia first to surface the browser permission dialog.
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(t => t.stop());
          beginRecognition();
        })
        .catch(() => {
          setMicError('Mic blocked. Click the lock icon in your address bar and allow the microphone.');
          setTimeout(() => setMicError(''), 6000);
        });
    }
  }

  // ---- Streaming speech -------------------------------------------------
  // Each finished sentence is sent to the voice as soon as it streams in, so
  // audio starts while the rest of the reply is still being written. Chunks
  // are fetched in parallel but always played in order.
  const TTS_CHAR_BUDGET = { browser: 500, elevenlabs: 1000, google: 4000, openai: 2000, orpheus: 800, qwen: 600 };
  const FIRST_CHUNK_MIN = 1;    // speak the first sentence immediately
  // Qwen is the exception to sentence-by-sentence speech. Each request to it
  // spends one of a handful of free GPU generations a day, so the whole reply
  // goes in a single request once it has finished streaming. Infinity here
  // means "never cut early"; the reply is sent when it ends.
  const WHOLE_REPLY_PROVIDERS = new Set(['qwen']);
  // Then batch sentences to limit API calls (Google's free voice quota is small).
  const LATER_CHUNK_MIN = { google: 450, elevenlabs: 300, openai: 300, orpheus: 150, browser: 200 };
  // After a quota/rate error, skip that provider for a while and use the browser voice.
  const VOICE_COOLDOWN_MS = 10 * 60 * 1000;

  function startSpeech(onEnd) {
    if (!aiVoiceRef.current) return null;
    const q = { items: [], index: 0, buffer: '', spent: 0, finished: false,
                cancelled: false, playing: false, errorShown: false, onEnd };
    speechRef.current = q;
    return q;
  }

  function feedSpeech(q, text, final = false) {
    if (!q || q.cancelled) return;
    q.buffer += text;
    for (;;) {
      const whole = WHOLE_REPLY_PROVIDERS.has(ttsProviderRef.current) && !isCooling(ttsProviderRef.current);
      const later = LATER_CHUNK_MIN[ttsProviderRef.current] ?? 200;
      const cut = whole ? -1 : findSpeechCut(q.buffer, q.items.length === 0 ? FIRST_CHUNK_MIN : later);
      if (cut === -1) break;
      enqueueSpeech(q, q.buffer.slice(0, cut));
      q.buffer = q.buffer.slice(cut);
    }
    if (final) {
      if (q.buffer.trim()) enqueueSpeech(q, q.buffer);
      q.buffer = '';
      q.finished = true;
      pumpSpeech(q);
    }
  }

  function isCooling(provider) {
    return (voiceCooldownRef.current[provider] ?? 0) > Date.now();
  }

  // Which voice actually speaks. A voice that has hit its limit is skipped for
  // a while. Qwen runs out daily by design, so it steps down to Google, which
  // still sounds good; everything else steps down to the browser voice.
  function providerToUse(chosen) {
    if (!isCooling(chosen)) return chosen;
    if (chosen === 'qwen' && !isCooling('google')) return 'google';
    return 'browser';
  }

  function enqueueSpeech(q, raw) {
    const chosen = ttsProviderRef.current;
    const provider = providerToUse(chosen);
    let text = stripMarkdown(raw);
    if (!text.trim()) return;
    const budget = TTS_CHAR_BUDGET[provider] ?? 4000;
    if (q.spent >= budget) return;
    if (q.spent + text.length > budget) text = truncateForTts(text, budget - q.spent);
    q.spent += text.length;

    const persona = personality?.persona ?? 'wiseguy';
    const item = { provider, text, persona };
    // Start fetching the audio now, while earlier chunks are still playing.
    if (provider !== 'browser') item.audio = fetchSpeechAudio(text, provider, persona);
    q.items.push(item);
    pumpSpeech(q);
  }

  async function fetchSpeechAudio(text, provider, persona) {
    try {
      const voice = provider === 'google'   ? googleVoiceRef.current
                  : provider === 'openai'   ? oaVoiceRef.current
                  : provider === 'orpheus'  ? orVoiceRef.current
                  : provider === 'qwen'     ? qwVoiceRef.current
                  : elVoiceRef.current;
      const style = provider === 'qwen' ? qwStyleRef.current.trim() : '';
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: toProviderTags(text, provider, persona), provider, voice, persona, ...(style && { style }) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          voiceCooldownRef.current[provider] = Date.now() + VOICE_COOLDOWN_MS;
          return { error: errData.error || 'Voice limit reached — using the browser voice.', fallback: true };
        }
        if (res.status === 403 && errData.locked) {
          // Admin-only voice and this browser isn't unlocked: stop asking for it.
          voiceCooldownRef.current[provider] = Date.now() + 24 * 60 * 60 * 1000;
          return { error: errData.error, fallback: true };
        }
        return { error: errData.error || `Voice error ${res.status}` };
      }
      return { buffer: await res.arrayBuffer() };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function pumpSpeech(q) {
    if (q.playing || q.cancelled) return;
    q.playing = true;
    while (!q.cancelled && q.index < q.items.length) {
      await playSpeechItem(q, q.items[q.index++]);
    }
    q.playing = false;
    if (!q.cancelled && q.finished && q.index >= q.items.length) {
      const done = q.onEnd;
      q.onEnd = null;
      if (speechRef.current === q) speechRef.current = null;
      done?.();
    }
  }

  function playSpeechItem(q, item) {
    return new Promise(async resolve => {
      q.resolveCurrent = resolve;

      const speakWithBrowser = () => {
        const browserStyle = PERSONA_BROWSER_TTS[item.persona] ?? { rate: 1.05, pitch: 1.0 };
        const tune = browserVoiceParams(voiceFxRef.current);
        const laughText = item.persona === 'evil_genius' ? 'Mwahahahaha!' : 'Ha ha ha!';
        const segments = splitVoiceSegments(item.text)
          .map(seg => seg.style === 'laugh' ? { ...seg, text: laughText } : seg)
          .filter(seg => seg.text.trim());
        if (segments.length === 0) return resolve();
        segments.forEach((seg, i) => {
          const mod  = BROWSER_SEGMENT_STYLE[seg.style] ?? BROWSER_SEGMENT_STYLE.normal;
          const utt  = new SpeechSynthesisUtterance(seg.text);
          utt.rate   = Math.min(2, browserStyle.rate * mod.rate * ttsSpeedRef.current);
          utt.pitch  = Math.min(2, Math.max(0.1, browserStyle.pitch * mod.pitch * tune.pitch));
          utt.volume = Math.min(1, mod.volume * tune.volume);
          if (i === segments.length - 1) { utt.onend = resolve; utt.onerror = resolve; }
          window.speechSynthesis.speak(utt);
        });
      };

      if (item.provider === 'browser') return speakWithBrowser();

      const result = await item.audio;
      if (q.cancelled) return resolve();
      if (result.error) {
        if (!q.errorShown) {
          q.errorShown = true;
          setMicError(result.error);
          setTimeout(() => setMicError(''), 6000);
        }
        // Out of quota: say this chunk with the browser voice instead of skipping it.
        return result.fallback ? speakWithBrowser() : resolve();
      }

      try {
        const ctx = audioCtxRef.current;
        if (ctx) {
          const audioBuffer = await ctx.decodeAudioData(result.buffer);
          if (q.cancelled) return resolve();
          // Applies speed, pitch, volume and equalizer. With everything at its
          // default this plays the clip untouched, wired straight to the speakers.
          const playing = playTuned(ctx, audioBuffer, {
            speed: ttsSpeedRef.current,
            fx: voiceFxRef.current,
            onended: resolve,
          });
          sourceNodeRef.current = playing.source;
        } else {
          const url   = URL.createObjectURL(new Blob([result.buffer]));
          const audio = new Audio(url);
          // No Web Audio here, so tuning can't be applied. Speed still can.
          audio.playbackRate = ttsSpeedRef.current;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audioRef.current = audio;
          audio.play().catch(e => { console.error('[tts fallback]', e.message); resolve(); });
        }
      } catch (err) {
        console.error('[tts]', err.message);
        resolve();
      }
    });
  }

  const submitText = useCallback(async (text) => {
    if (!text || loadingRef.current) return;
    stopAudio();

    const userMsg = { role: 'user', content: text };
    const history = messagesRef.current;

    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    let fullResponse = '';
    // In hands-free mode, start listening again once the AI finishes speaking.
    const afterSpeech = () => { if (handsFreeModeRef.current) startListening({ auto: true }); };
    const speech = startSpeech(afterSpeech);

    try {
      const chatBody = {
        messages: [...history, userMsg],
        model,
        personality,
        memory: getMemory(),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || ERROR_REPLY);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        feedSpeech(speech, chunk);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }

      // Auto-save conversation after each successful exchange
      const savedMessages = [...history, userMsg, { role: 'assistant', content: fullResponse }];
      const now = Date.now();
      saveConversation({
        id:       convIdRef.current,
        title:    convTitle(savedMessages),
        created:  convCreatedRef.current,
        updated:  now,
        messages: savedMessages,
      });
      setConvHistory(loadHistory());

      if (speech) feedSpeech(speech, '', true);
      else afterSpeech();
    } catch (err) {
      if (speech) speech.cancelled = true;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: err?.message || ERROR_REPLY };
        return updated;
      });
    } finally {
      setLoading(false);
      if (!handsFreeModeRef.current) inputRef.current?.focus();
    }
  }, [model, personality]); // eslint-disable-line

  // Keep submitTextRef pointing at the latest submitText so the continuous loop
  // never closes over a stale version (model or personality may have changed).
  useEffect(() => { submitTextRef.current = submitText; }, [submitText]);

  function startNewChat() {
    stopAudio();
    recognitionRef.current?.abort?.();
    convIdRef.current      = makeConvId();
    convCreatedRef.current = Date.now();
    setMessages([{ role: 'assistant', content: "Oh good, you're here. Ask me something." }]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function loadConv(conv) {
    stopAudio();
    recognitionRef.current?.abort?.();
    convIdRef.current      = conv.id;
    convCreatedRef.current = conv.created;
    setMessages(conv.messages);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleDeleteConv(id) {
    deleteConversation(id);
    const updated = loadHistory();
    setConvHistory(updated);
    // If we deleted the active conversation, start fresh
    if (id === convIdRef.current) {
      if (updated.length > 0) {
        loadConv(updated[0]);
      } else {
        startNewChat();
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    unlockAudioContext();
    submitText(input.trim());
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      unlockAudioContext();
      submitText(input.trim());
    }
  }

  function handleMic() {
    // In always-on mode the mic button is the mute toggle, not push-to-talk
    if (alwaysOn) { toggleMicMuted(); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    startListening();
  }

  function fetchElVoices() {
    fetch('/api/elevenlabs-voices')
      .then(r => r.json())
      .then(data => {
        if (data.voices?.length) {
          setElVoices(data.voices);
          // If current voice isn't in the fetched list, switch to the first available
          setElVoice(prev =>
            data.voices.some(v => v.id === prev) ? prev : data.voices[0].id
          );
        }
      })
      .catch(() => {});
  }

  function cycleProvider() {
    const next = TTS_PROVIDERS[(TTS_PROVIDERS.indexOf(ttsProvider) + 1) % TTS_PROVIDERS.length];
    setTtsProvider(next);
    if (next === 'elevenlabs') fetchElVoices();
    try { localStorage.setItem(TTS_PROVIDER_KEY, next); } catch {}
  }

  function cycleVoice() {
    if (ttsProvider === 'google') {
      const next = nextVoice(GOOGLE_VOICES, googleVoice);
      setGoogleVoice(next);
      try { localStorage.setItem(TTS_VOICE_GOOGLE_KEY, next); } catch {}
    } else if (ttsProvider === 'elevenlabs') {
      const next = nextVoice(elVoices, elVoice);
      setElVoice(next);
      try { localStorage.setItem(TTS_VOICE_ELEVENLABS_KEY, next); } catch {}
    } else if (ttsProvider === 'openai') {
      const next = nextVoice(OPENAI_VOICES, oaVoice);
      setOaVoice(next);
      try { localStorage.setItem(TTS_VOICE_OPENAI_KEY, next); } catch {}
    } else if (ttsProvider === 'orpheus') {
      const next = nextVoice(ORPHEUS_VOICES, orVoice);
      setOrVoice(next);
      try { localStorage.setItem(TTS_VOICE_ORPHEUS_KEY, next); } catch {}
    } else if (ttsProvider === 'qwen') {
      const next = nextVoice(QWEN_VOICES, qwVoice);
      setQwVoice(next);
      try { localStorage.setItem(TTS_VOICE_QWEN_KEY, next); } catch {}
    }
  }

  function toggleVoiceMode() {
    const next = voiceMode === 'review' ? 'auto' : 'review';
    setVoiceMode(next);
    try { localStorage.setItem(VOICE_MODE_KEY, next); } catch {}
  }

  function toggleAiVoice() {
    const next = !aiVoice;
    if (next) unlockAudioContext();
    if (!next) stopAudio();
    setAiVoice(next);
    try { localStorage.setItem(AI_VOICE_KEY, String(next)); } catch {}
  }

  function toggleHandsFree() {
    const next = !handsFree;
    if (next) {
      unlockAudioContext();
      // Enable AI voice automatically when entering hands-free
      if (!aiVoice) {
        setAiVoice(true);
        try { localStorage.setItem(AI_VOICE_KEY, 'true'); } catch {}
      }
      // Start listening right away — must be synchronous on iOS (gesture context)
      startListening();
    } else {
      stopAudio();
      recognitionRef.current?.abort?.();
      closeMic(micStreamRef.current);
      micStreamRef.current = null;
    }
    setHandsFree(next);
    try { localStorage.setItem(HANDS_FREE_KEY, String(next)); } catch {}
  }

  const currentVoiceName = ttsProvider === 'google'
    ? GOOGLE_VOICES.find(v => v.id === googleVoice)?.name
    : ttsProvider === 'elevenlabs'
    ? elVoices.find(v => v.id === elVoice)?.name
    : ttsProvider === 'openai'
    ? OPENAI_VOICES.find(v => v.id === oaVoice)?.name
    : ttsProvider === 'orpheus'
    ? ORPHEUS_VOICES.find(v => v.id === orVoice)?.name
    : ttsProvider === 'qwen'
    ? QWEN_VOICES.find(v => v.id === qwVoice)?.name
    : null;

  return (
    <div className={styles.page}>
      <HistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={convHistory}
        activeId={convIdRef.current}
        onLoad={loadConv}
        onNew={startNewChat}
        onDelete={handleDeleteConv}
      />
      <div className={styles.thread}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className={styles.typing}><span /><span /><span /></div>
        )}
        <div ref={bottomRef} />
      </div>

      {micError && <div className={styles.micError}>{micError}</div>}

      <div className={styles.controlsBar}>
        <div className={styles.leftControls}>
          <button
            className={styles.historyBtn}
            onClick={() => setSidebarOpen(o => !o)}
            title="Conversation history"
          >☰ History</button>
          {alwaysOn && !micMuted && (
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              Live
            </div>
          )}
          {alwaysOn && micMuted && (
            <div className={styles.mutedPill}>Mic muted</div>
          )}
        </div>

        <div className={styles.voiceToggles}>
          <button
            className={`${styles.ctrlBtn} ${aiVoice ? styles.ctrlActive : ''}`}
            onClick={toggleAiVoice}
            title={aiVoice ? 'AI voice on — tap to mute' : 'AI voice off — tap to unmute'}
          >
            {aiVoice ? '🔊' : '🔇'}
          </button>
          <button
            className={`${styles.ctrlBtn} ${alwaysOn ? styles.ctrlActive : ''}`}
            onClick={toggleAlwaysOn}
            title={alwaysOn ? 'Always-on listening: ON — tap to stop' : 'Always-on listening: OFF — tap to start'}
          >
            🎙️ {alwaysOn ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? 'Listening…' : handsFree ? 'Hands-free active…' : 'Say something...'}
          rows={1}
          disabled={loading}
        />
        <button
          type="button"
          className={`${styles.micBtn} ${
            alwaysOn
              ? (micMuted ? styles.micMuted : (listening ? styles.micActive : styles.micLive))
              : (listening ? styles.micActive : '')
          }`}
          onClick={handleMic}
          disabled={loading && !alwaysOn}
          title={
            alwaysOn
              ? (micMuted ? 'Tap to unmute mic' : 'Mic live — tap to mute')
              : (listening ? 'Stop recording' : 'Voice input')
          }
        >
          {alwaysOn && micMuted ? '🔇' : '🎤'}
        </button>
        <button
          className={styles.sendBtn}
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
