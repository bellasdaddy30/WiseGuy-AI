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
  DEFAULT_TTS_PROVIDER, DEFAULT_GOOGLE_VOICE, DEFAULT_ELEVENLABS_VOICE, DEFAULT_OPENAI_VOICE, DEFAULT_ORPHEUS_VOICE,
  DEFAULT_TTS_SPEED,
  VOICE_MODE_KEY, AI_VOICE_KEY, HANDS_FREE_KEY,
} from '../../lib/tts';
import { splitVoiceSegments, toProviderTags } from '../../lib/voiceTags';
import styles from './chat.module.css';

const ERROR_REPLY = "The AI service isn't responding right now.";

const TTS_PROVIDERS = ['browser', 'google', 'elevenlabs', 'openai', 'orpheus'];
const TTS_LABELS    = { browser: 'Browser', google: 'Google', elevenlabs: 'ELabs', openai: 'OpenAI', orpheus: 'Orpheus' };

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
  const ttsSpeedRef         = useRef(DEFAULT_TTS_SPEED);
  const loadingRef          = useRef(loading);
  const messagesRef         = useRef(messages);
  const alwaysOnRef         = useRef(false);
  const micMutedRef         = useRef(false);
  const continuousActiveRef = useRef(false);
  const submitTextRef       = useRef(null);

  useEffect(() => { voiceModeRef.current     = voiceMode;   }, [voiceMode]);
  useEffect(() => { aiVoiceRef.current       = aiVoice;     }, [aiVoice]);
  useEffect(() => { handsFreeModeRef.current = handsFree;   }, [handsFree]);
  useEffect(() => { ttsProviderRef.current   = ttsProvider; }, [ttsProvider]);
  useEffect(() => { googleVoiceRef.current   = googleVoice; }, [googleVoice]);
  useEffect(() => { elVoiceRef.current       = elVoice;     }, [elVoice]);
  useEffect(() => { oaVoiceRef.current       = oaVoice;     }, [oaVoice]);
  useEffect(() => { orVoiceRef.current       = orVoice;     }, [orVoice]);
  useEffect(() => { ttsSpeedRef.current      = ttsSpeed;    }, [ttsSpeed]);
  useEffect(() => { loadingRef.current       = loading;     }, [loading]);
  useEffect(() => { messagesRef.current      = messages;    }, [messages]);
  useEffect(() => { alwaysOnRef.current      = alwaysOn;   }, [alwaysOn]);
  useEffect(() => { micMutedRef.current      = micMuted;   }, [micMuted]);

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
      const spd = parseFloat(localStorage.getItem(TTS_SPEED_KEY));
      if (spd > 0) { setTtsSpeed(spd); ttsSpeedRef.current = spd; }
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
      recognitionRef.current?.stop();
      setListening(false);
      setMicMuted(false);
      micMutedRef.current = false;
    }
  }

  function toggleMicMuted() {
    const next = !micMutedRef.current;
    setMicMuted(next);
    micMutedRef.current = next;
    if (next) {
      recognitionRef.current?.stop();
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
  function startListening() {
    const isIOS = detectIOS();
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
  const TTS_CHAR_BUDGET = { browser: 500, elevenlabs: 1000, google: 4000, openai: 2000 };
  const FIRST_CHUNK_MIN = 1;    // speak the first sentence immediately
  // Then batch sentences to limit API calls (Google's free voice quota is small).
  const LATER_CHUNK_MIN = { google: 450, elevenlabs: 300, openai: 300, browser: 200 };
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
      const later = LATER_CHUNK_MIN[ttsProviderRef.current] ?? 200;
      const cut = findSpeechCut(q.buffer, q.items.length === 0 ? FIRST_CHUNK_MIN : later);
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

  function enqueueSpeech(q, raw) {
    const chosen = ttsProviderRef.current;
    const cooling = (voiceCooldownRef.current[chosen] ?? 0) > Date.now();
    const provider = cooling ? 'browser' : chosen;
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
                  : elVoiceRef.current;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: toProviderTags(text, provider, persona), provider, voice, persona }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          voiceCooldownRef.current[provider] = Date.now() + VOICE_COOLDOWN_MS;
          return { error: errData.error || 'Voice limit reached — using the browser voice.', fallback: true };
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
        const laughText = item.persona === 'evil_genius' ? 'Mwahahahaha!' : 'Ha ha ha!';
        const segments = splitVoiceSegments(item.text)
          .map(seg => seg.style === 'laugh' ? { ...seg, text: laughText } : seg)
          .filter(seg => seg.text.trim());
        if (segments.length === 0) return resolve();
        segments.forEach((seg, i) => {
          const mod  = BROWSER_SEGMENT_STYLE[seg.style] ?? BROWSER_SEGMENT_STYLE.normal;
          const utt  = new SpeechSynthesisUtterance(seg.text);
          utt.rate   = Math.min(2, browserStyle.rate * mod.rate * ttsSpeedRef.current);
          utt.pitch  = Math.min(2, browserStyle.pitch * mod.pitch);
          utt.volume = mod.volume;
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
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.playbackRate.value = ttsSpeedRef.current;
          source.onended = resolve;
          sourceNodeRef.current = source;
          source.start(0);
        } else {
          const url   = URL.createObjectURL(new Blob([result.buffer]));
          const audio = new Audio(url);
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
    const afterSpeech = () => { if (handsFreeModeRef.current) startListening(); };
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
    recognitionRef.current?.stop();
    convIdRef.current      = makeConvId();
    convCreatedRef.current = Date.now();
    setMessages([{ role: 'assistant', content: "Oh good, you're here. Ask me something." }]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function loadConv(conv) {
    stopAudio();
    recognitionRef.current?.stop();
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
      recognitionRef.current?.stop();
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
