'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from '../../components/ChatMessage';
import HistorySidebar from '../../components/HistorySidebar';
import { MODELS, DEFAULT_MODEL } from '../../lib/models';
import { DEFAULT_PERSONALITY, PERSONALITY_KEY } from '../../lib/personality';
import { loadHistory, saveConversation, deleteConversation, makeConvId, convTitle } from '../../lib/history';
import {
  stripMarkdown, truncateForTts, nextVoice,
  GOOGLE_VOICES, ELEVENLABS_VOICES, PERSONA_BROWSER_TTS,
  TTS_PROVIDER_KEY, TTS_VOICE_GOOGLE_KEY, TTS_VOICE_ELEVENLABS_KEY,
  DEFAULT_TTS_PROVIDER, DEFAULT_GOOGLE_VOICE, DEFAULT_ELEVENLABS_VOICE,
} from '../../lib/tts';
import styles from './chat.module.css';

const ERROR_REPLY      = "The AI service isn't responding right now.";
const MODEL_KEY        = 'smartass_model';
const VOICE_MODE_KEY   = 'smartass_voice_mode';
const AI_VOICE_KEY     = 'smartass_ai_voice';
const HANDS_FREE_KEY   = 'smartass_hands_free';

const TTS_PROVIDERS = ['browser', 'google', 'elevenlabs'];
const TTS_LABELS    = { browser: 'Browser', google: 'Google', elevenlabs: 'ELabs' };

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
  const [micError, setMicError]         = useState('');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [convHistory, setConvHistory]   = useState([]);

  const convIdRef      = useRef(null);
  const convCreatedRef = useRef(null);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef  = useRef('');
  const audioRef       = useRef(null);
  const audioCtxRef    = useRef(null);
  const sourceNodeRef  = useRef(null);
  // Refs so async closures always see current values
  const voiceModeRef   = useRef(voiceMode);
  const aiVoiceRef     = useRef(aiVoice);
  const handsFreeModeRef = useRef(handsFree);
  const ttsProviderRef = useRef(ttsProvider);
  const googleVoiceRef = useRef(googleVoice);
  const elVoiceRef     = useRef(elVoice);
  const loadingRef     = useRef(loading);
  const messagesRef    = useRef(messages);

  useEffect(() => { voiceModeRef.current     = voiceMode;   }, [voiceMode]);
  useEffect(() => { aiVoiceRef.current       = aiVoice;     }, [aiVoice]);
  useEffect(() => { handsFreeModeRef.current = handsFree;   }, [handsFree]);
  useEffect(() => { ttsProviderRef.current   = ttsProvider; }, [ttsProvider]);
  useEffect(() => { googleVoiceRef.current   = googleVoice; }, [googleVoice]);
  useEffect(() => { elVoiceRef.current       = elVoice;     }, [elVoice]);
  useEffect(() => { loadingRef.current       = loading;     }, [loading]);
  useEffect(() => { messagesRef.current      = messages;    }, [messages]);

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
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    } catch {}
  }

  function stopAudio() {
    try { if (sourceNodeRef.current) { sourceNodeRef.current.stop(); sourceNodeRef.current = null; } } catch {}
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
  }

  // startListening is defined here so speakText can call it after audio ends
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError('Voice input needs HTTPS. Works when the app is deployed.');
      setTimeout(() => setMicError(''), 4000);
      return;
    }
    if (loadingRef.current) return;

    stopAudio();
    setMicError('');

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
      if (e.error === 'not-allowed') {
        setMicError('Microphone access denied. Check browser permissions.');
        setTimeout(() => setMicError(''), 4000);
      } else if (e.error === 'network') {
        setMicError('Voice input requires HTTPS. Works when deployed.');
        setTimeout(() => setMicError(''), 4000);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch {
      setMicError('Voice input not available in this browser.');
      setTimeout(() => setMicError(''), 4000);
    }
  }

  async function speakText(text, onEnd) {
    if (!aiVoiceRef.current) { onEnd?.(); return; }
    stopAudio();

    const provider = ttsProviderRef.current;
    const raw      = stripMarkdown(text);
    const clean    = provider === 'browser'    ? truncateForTts(raw, 500)
                   : provider === 'elevenlabs' ? truncateForTts(raw, 1000)
                   : raw;

    const persona = personality?.persona ?? 'smartass';

    if (provider === 'browser') {
      const browserStyle = PERSONA_BROWSER_TTS[persona] ?? { rate: 1.05, pitch: 1.0 };
      const utt  = new SpeechSynthesisUtterance(clean);
      utt.rate   = browserStyle.rate;
      utt.pitch  = browserStyle.pitch;
      utt.onend  = () => onEnd?.();
      window.speechSynthesis.speak(utt);
      return;
    }

    const voice = provider === 'google' ? googleVoiceRef.current : elVoiceRef.current;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, provider, voice, persona }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || `Voice error ${res.status}`;
        setMicError(msg);
        setTimeout(() => setMicError(''), 6000);
        onEnd?.();
        return;
      }

      const arrayBuffer = await res.arrayBuffer();
      const ctx = audioCtxRef.current;

      if (ctx) {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => onEnd?.();
        sourceNodeRef.current = source;
        source.start(0);
      } else {
        const blob  = new Blob([arrayBuffer]);
        const url   = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
        audioRef.current = audio;
        audio.play().catch(e => { console.error('[tts fallback]', e.message); onEnd?.(); });
      }
    } catch (err) {
      console.error('[tts]', err.message);
      onEnd?.();
    }
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

    try {
      const chatBody = {
        messages: [...history, userMsg],
        model,
        personality,
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

      // In hands-free mode, start listening again after AI finishes speaking
      speakText(fullResponse, () => {
        if (handsFreeModeRef.current) startListening();
      });
    } catch (err) {
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
      // Start listening right away
      setTimeout(() => startListening(), 100);
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
        >☰</button>
        <span className={styles.modelName}>
          {MODELS.find(m => m.id === model)?.name ?? model}
        </span>
        </div>

        <div className={styles.voiceToggles}>
          <button
            className={`${styles.ctrlBtn} ${voiceMode === 'auto' ? styles.ctrlActive : ''}`}
            onClick={toggleVoiceMode}
            title={voiceMode === 'review' ? 'Review: fills field, you send manually' : 'Auto: sends when you stop talking'}
          >
            {voiceMode === 'review' ? 'Review' : 'Auto'}
          </button>

          <button
            className={`${styles.ctrlBtn} ${handsFree ? styles.ctrlHandsFree : ''}`}
            onClick={toggleHandsFree}
            title="Hands-Free: AI talks back then listens automatically"
          >
            {handsFree ? '🎙️ Live' : '🎙️'}
          </button>

          <button
            className={`${styles.ctrlBtn} ${ttsProvider !== 'browser' ? styles.ctrlActive : ''}`}
            onClick={cycleProvider}
            title="Cycle voice provider"
          >
            {TTS_LABELS[ttsProvider]}
          </button>

          {currentVoiceName && (
            <button className={styles.ctrlBtn} onClick={cycleVoice} title="Cycle voice">
              {currentVoiceName}
            </button>
          )}

          <button
            className={`${styles.ctrlBtn} ${aiVoice ? styles.ctrlActive : ''}`}
            onClick={toggleAiVoice}
            title={aiVoice ? 'AI voice on' : 'AI voice off'}
          >
            {aiVoice ? '🔊' : '🔇'}
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
          className={`${styles.micBtn} ${listening ? styles.micActive : ''}`}
          onClick={handleMic}
          disabled={loading}
          title={listening ? 'Stop recording' : 'Voice input'}
        >
          🎤
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
