'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TTS_PROVIDER_KEY, TTS_SPEED_KEY,
  TTS_VOICE_GOOGLE_KEY, TTS_VOICE_ELEVENLABS_KEY, TTS_VOICE_OPENAI_KEY, TTS_VOICE_ORPHEUS_KEY,
  TTS_VOICE_QWEN_KEY, TTS_QWEN_STYLE_KEY, DEFAULT_QWEN_VOICE, QWEN_VOICES,
  DEFAULT_TTS_PROVIDER, DEFAULT_GOOGLE_VOICE, DEFAULT_ELEVENLABS_VOICE, DEFAULT_OPENAI_VOICE, DEFAULT_ORPHEUS_VOICE,
  DEFAULT_TTS_SPEED,
  GOOGLE_VOICES, ELEVENLABS_VOICES, OPENAI_VOICES, ORPHEUS_VOICES,
  VOICE_MODE_KEY, AI_VOICE_KEY, HANDS_FREE_KEY,
} from '../../lib/tts';
import { MODEL_KEY, MODELS, DEFAULT_MODEL } from '../../lib/models';
import { clearHistory } from '../../lib/history';
import { PERSONALITY_KEY } from '../../lib/personality';
import { getMemory, addMemoryItem, removeMemoryItem, clearMemory, MEMORY_KEY } from '../../lib/memory';
import {
  VOICE_FX_KEY, VOICE_FX_PRESETS, EQ_BANDS, EQ_RANGE_DB, PITCH_RANGE, VOLUME_MAX, SPEED_MIN, SPEED_MAX,
  normalizeVoiceFx, loadVoiceFx, saveVoiceFx, matchingPreset, browserVoiceParams, playTuned,
} from '../../lib/voicefx';
import { SAMPLE_MIN, SAMPLE_MAX, DESCRIPTION_MAX } from '../../lib/voiceDesign';
import BuildCheck from '../../components/BuildCheck';
import styles from './settings.module.css';

const TTS_PROVIDERS = [
  { id: 'browser',    label: 'Browser',    desc: 'Built-in. Free, works everywhere. Basic quality.' },
  { id: 'google',     label: 'Google',     desc: 'High quality. Free via your Gemini API key.' },
  { id: 'elevenlabs', label: 'ElevenLabs', desc: 'Premium voices. Each persona gets its own voice.', adminOnly: true },
  { id: 'openai',     label: 'OpenAI',     desc: 'High quality. Needs OPENAI_API_KEY.', adminOnly: true },
  { id: 'orpheus',    label: 'Orpheus',    desc: 'Emotion-reactive. Free via your Groq API key.', adminOnly: true },
  { id: 'qwen',       label: 'Qwen',       desc: 'Your own Hugging Face Space. Free, but only a few uses a day.', adminOnly: true },
];


const VOICE_MODES = [
  { id: 'off',       label: 'Off',          desc: 'No voice. Text only.' },
  { id: 'push',      label: 'Push to Talk', desc: 'Hold the mic button to record.' },
  { id: 'auto',      label: 'Auto Send',    desc: 'Tap mic, speak, releases automatically.' },
  { id: 'handsfree', label: 'Hands Free',   desc: 'AI listens again after each response.' },
];

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

const SAMPLE_LINE = 'Hey there — WiseGuy AI at your service.';
const BROWSER_TEST_ID = '__browser__';

// "+3", "−1.5", "0" — one decimal only when it is needed
function signed(v) {
  if (Math.abs(v) < 0.001) return '0';
  const n = Math.abs(v);
  return `${v > 0 ? '+' : '−'}${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

function TuneSlider({ label, hint, display, value, min, max, step, onChange, disabled }) {
  return (
    <label className={`${styles.tuneRow} ${disabled ? styles.tuneDisabled : ''}`}>
      <span className={styles.tuneRowHead}>
        <span className={styles.tuneLabel}>
          {label}{hint && <span className={styles.tuneHint}> · {hint}</span>}
        </span>
        <span className={styles.tuneValue}>{display}</span>
      </span>
      <input
        type="range" className={styles.tuneSlider}
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export default function SettingsPage() {
  const [ttsProvider, setTtsProvider] = useState(DEFAULT_TTS_PROVIDER);
  const [googleVoice, setGoogleVoice] = useState(DEFAULT_GOOGLE_VOICE);
  const [elVoice,     setElVoice]     = useState(DEFAULT_ELEVENLABS_VOICE);
  const [elVoices,    setElVoices]    = useState(ELEVENLABS_VOICES);
  const [oaVoice,     setOaVoice]     = useState(DEFAULT_OPENAI_VOICE);
  const [orVoice,     setOrVoice]     = useState(DEFAULT_ORPHEUS_VOICE);
  const [qwVoice,     setQwVoice]     = useState(DEFAULT_QWEN_VOICE);
  // Qwen only: a plain-English note on how to say things. Empty = persona's own style.
  const [qwStyle,     setQwStyle]     = useState('');
  const qwStyleRef = useRef('');
  const [aiVoice,     setAiVoice]     = useState(true);
  // FIX: was 'on', which is not one of the VOICE_MODES ids, so no card could ever match it.
  const [voiceMode,   setVoiceMode]   = useState('off');

  // Voice demo
  const [playingDemo, setPlayingDemo] = useState(null);
  const demoAudioRef = useRef(null);
  // FIX: counter that goes up on every stop. A preview that is still loading
  // compares against it and bails out if a newer tap has happened since.
  const demoReqRef = useRef(0);
  const [demoError, setDemoError] = useState('');

  // Voice Tuning: pitch, volume and equalizer. Speed is voiceSpeed, further down.
  const [fx, setFx] = useState(() => normalizeVoiceFx(null));
  // Refs so code that runs after a network wait reads the sliders as they are now
  const fxRef          = useRef(fx);
  const speedRef       = useRef(DEFAULT_TTS_SPEED);
  const audioCtxRef    = useRef(null);       // Web Audio engine, created on the first tap
  const demoHandleRef  = useRef(null);       // the tuned clip that is playing, if any
  const sampleCacheRef = useRef(new Map());  // provider:voice -> fetched sample, so re-testing is free
  const lastDemoRef    = useRef(null);       // what the last preview was, for restarting it
  const prevTuneRef    = useRef(null);

  // Design a Voice
  const [dvOpen,           setDvOpen]           = useState(false);
  const [dvGender,         setDvGender]         = useState('male');
  const [dvAge,            setDvAge]            = useState('middle_aged');
  const [dvAccent,         setDvAccent]         = useState('american');
  const [dvAccentStrength, setDvAccentStrength] = useState(1.0);
  const [dvDescription,    setDvDescription]    = useState('');
  const [dvText,           setDvText]           = useState("Hey there — WiseGuy AI at your service. Ask me anything you want, and I'll give you a straight answer, whether you like it or not.");
  const [dvGenerating,     setDvGenerating]     = useState(false);
  const [dvAudioUrl,       setDvAudioUrl]       = useState(null);
  const [dvVoiceId,        setDvVoiceId]        = useState(null);
  const [dvName,           setDvName]           = useState('');
  const [dvSaving,         setDvSaving]         = useState(false);
  const [dvSaved,          setDvSaved]          = useState(false);
  const [dvError,          setDvError]          = useState('');

  const [voiceSpeed,     setVoiceSpeed]     = useState(DEFAULT_TTS_SPEED);
  const [clearConfirm,   setClearConfirm]   = useState(false);
  const [cleared,        setCleared]        = useState(false);
  const [resetConfirm,   setResetConfirm]   = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [adminUnlocked,  setAdminUnlocked]  = useState(false);

  // Memory
  const [memoryItems, setMemoryItems] = useState([]);
  const [memInput,    setMemInput]    = useState('');
  const [memCleared,  setMemCleared]  = useState(false);

  function fetchElVoices() {
    fetch('/api/elevenlabs-voices')
      .then(r => r.json())
      .then(data => {
        if (data.voices?.length) {
          setElVoices(data.voices);
          setElVoice(prev =>
            data.voices.some(v => v.id === prev) ? prev : data.voices[0].id
          );
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    setMemoryItems(getMemory());
    const tp = load(TTS_PROVIDER_KEY, DEFAULT_TTS_PROVIDER);
    setTtsProvider(tp);
    // The server decides who is admin (signed cookie). Until it answers,
    // locked voices stay hidden; if it says no, fall back to the default.
    fetch('/api/admin-unlock')
      .then(r => r.json())
      .then(d => {
        setAdminUnlocked(!!d.admin);
        if (!d.admin && TTS_PROVIDERS.find(p => p.id === tp)?.adminOnly) setTtsProvider(DEFAULT_TTS_PROVIDER);
        else if (d.admin && tp === 'elevenlabs') fetchElVoices();
      })
      .catch(() => {});
    setGoogleVoice(load(TTS_VOICE_GOOGLE_KEY, DEFAULT_GOOGLE_VOICE));
    setElVoice(load(TTS_VOICE_ELEVENLABS_KEY, DEFAULT_ELEVENLABS_VOICE));
    setOaVoice(load(TTS_VOICE_OPENAI_KEY, DEFAULT_OPENAI_VOICE));
    setOrVoice(load(TTS_VOICE_ORPHEUS_KEY, DEFAULT_ORPHEUS_VOICE));
    setQwVoice(load(TTS_VOICE_QWEN_KEY, DEFAULT_QWEN_VOICE));
    setQwStyle(load(TTS_QWEN_STYLE_KEY, ''));
    setVoiceSpeed(parseFloat(load(TTS_SPEED_KEY, String(DEFAULT_TTS_SPEED))) || DEFAULT_TTS_SPEED);
    setFx(loadVoiceFx());
    setAiVoice(load(AI_VOICE_KEY, 'true') === 'true');
    const hf = load(HANDS_FREE_KEY, 'false') === 'true';
    setVoiceMode(hf ? 'handsfree' : load(VOICE_MODE_KEY, 'off'));
  }, []);

  // FIX: stop any preview audio when leaving the Settings page,
  // otherwise it keeps playing with no way to stop it.
  useEffect(() => () => {
    demoReqRef.current += 1;
    demoHandleRef.current?.stop();
    demoHandleRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    const audio = demoAudioRef.current;
    if (audio) {
      audio.onended = audio.onerror = null;
      audio.pause();
      if (audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
      demoAudioRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  function handleSave() {
    save(TTS_PROVIDER_KEY, ttsProvider);
    save(TTS_SPEED_KEY, voiceSpeed);
    saveVoiceFx(fx);
    save(TTS_VOICE_GOOGLE_KEY, googleVoice);
    save(TTS_VOICE_ELEVENLABS_KEY, elVoice);
    save(TTS_VOICE_OPENAI_KEY, oaVoice);
    save(TTS_VOICE_ORPHEUS_KEY, orVoice);
    save(TTS_VOICE_QWEN_KEY, qwVoice);
    save(TTS_QWEN_STYLE_KEY, qwStyle.trim());
    save(AI_VOICE_KEY, aiVoice);
    if (voiceMode === 'handsfree') {
      save(HANDS_FREE_KEY, 'true');
      save(VOICE_MODE_KEY, 'auto');
    } else {
      save(HANDS_FREE_KEY, 'false');
      save(VOICE_MODE_KEY, voiceMode === 'off' ? 'push' : voiceMode);
      if (voiceMode === 'off') save(AI_VOICE_KEY, 'false');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearHistory() {
    if (!clearConfirm) { setClearConfirm(true); return; }
    clearHistory();
    setClearConfirm(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  }

  function handleResetAll() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    try {
      localStorage.removeItem(TTS_PROVIDER_KEY);
      localStorage.removeItem(TTS_VOICE_GOOGLE_KEY);
      localStorage.removeItem(TTS_VOICE_ELEVENLABS_KEY);
      localStorage.removeItem(TTS_VOICE_OPENAI_KEY);
      localStorage.removeItem(TTS_VOICE_ORPHEUS_KEY);
      localStorage.removeItem(TTS_VOICE_QWEN_KEY);
      localStorage.removeItem(TTS_QWEN_STYLE_KEY);
      localStorage.removeItem(AI_VOICE_KEY);
      localStorage.removeItem(VOICE_MODE_KEY);
      localStorage.removeItem(HANDS_FREE_KEY);
      localStorage.removeItem(TTS_SPEED_KEY);
      localStorage.removeItem(VOICE_FX_KEY);
      localStorage.removeItem(MODEL_KEY);
      localStorage.removeItem(PERSONALITY_KEY);
    } catch {}
    setResetConfirm(false);
    setTtsProvider(DEFAULT_TTS_PROVIDER);
    setGoogleVoice(DEFAULT_GOOGLE_VOICE);
    setElVoice(DEFAULT_ELEVENLABS_VOICE);
    setOaVoice(DEFAULT_OPENAI_VOICE);
    setOrVoice(DEFAULT_ORPHEUS_VOICE);
    setQwVoice(DEFAULT_QWEN_VOICE);
    setQwStyle('');
    setVoiceSpeed(DEFAULT_TTS_SPEED);
    setFx(normalizeVoiceFx(null));
    setAiVoice(true);
    // FIX: was 'on' (not a real mode). 'off' matches what a fresh load with empty storage gives.
    setVoiceMode('off');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleAddMemory(e) {
    e.preventDefault();
    if (!memInput.trim()) return;
    setMemoryItems(addMemoryItem(memInput));
    setMemInput('');
  }

  function handleRemoveMemory(i) {
    setMemoryItems(removeMemoryItem(i));
  }

  function handleClearMemory() {
    clearMemory();
    setMemoryItems([]);
    setMemCleared(true);
    setTimeout(() => setMemCleared(false), 3000);
  }

  // ── Voice demo ──────────────────────────────────────────────────────
  // iPhones only allow sound that was started by a tap. Creating the audio
  // engine and playing one silent sample inside the tap handler "unlocks" it,
  // so the real clip can start a second later when the server answers.
  function ensureAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const blip = ctx.createBufferSource();
      blip.buffer = ctx.createBuffer(1, 1, 22050);
      blip.connect(ctx.destination);
      blip.start(0);
      return ctx;
    } catch {
      return null;
    }
  }

  function stopDemo() {
    demoReqRef.current += 1; // cancels any preview that is still loading
    demoHandleRef.current?.stop();
    demoHandleRef.current = null;
    const audio = demoAudioRef.current;
    if (audio) {
      audio.onended = audio.onerror = null;
      audio.pause();
      if (audio._blobUrl) URL.revokeObjectURL(audio._blobUrl);
      demoAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPlayingDemo(null);
  }

  // restart: true replays the same voice instead of treating the call as "tap again to stop"
  async function playDemo(voiceId, provider, previewUrl, { restart = false } = {}) {
    if (!restart && playingDemo === voiceId) { stopDemo(); return; }
    stopDemo();
    const reqId = demoReqRef.current;
    const isStale = () => demoReqRef.current !== reqId;
    const done = () => {
      if (isStale()) return;
      demoHandleRef.current = null;
      setPlayingDemo(null);
    };
    const fail = message => {
      if (isStale()) return;
      setDemoError(message);
      done();
    };
    lastDemoRef.current = { voiceId, provider, previewUrl };
    setDemoError('');
    setPlayingDemo(voiceId);
    // Must run before the first await, while this is still "inside the tap"
    const ctx = provider === 'browser' || previewUrl ? null : ensureAudio();

    try {
      if (provider === 'browser') {
        // The device speaks this itself, so only speed, pitch and volume apply.
        const tune = browserVoiceParams(fxRef.current);
        const utt  = new SpeechSynthesisUtterance(SAMPLE_LINE);
        utt.rate   = Math.min(2, Math.max(0.1, speedRef.current));
        utt.pitch  = Math.min(2, Math.max(0.1, tune.pitch));
        utt.volume = Math.min(1, 0.85 * tune.volume); // 0.85 is what chat uses for normal speech
        utt.onend = utt.onerror = done;
        window.speechSynthesis.speak(utt);
        return;
      }

      if (previewUrl) {
        // ElevenLabs' own sample clip. Played as-is, straight from their server.
        const audio = new Audio(previewUrl);
        demoAudioRef.current = audio;
        const finish = () => {
          if (demoAudioRef.current !== audio) return;
          demoAudioRef.current = null;
          setPlayingDemo(null);
        };
        audio.onended = audio.onerror = finish;
        audio.play().catch(finish);
        return;
      }

      // Qwen takes a "how to say it" note. A different note is a different
      // clip, so it gets its own slot in the cache.
      const style = provider === 'qwen' ? qwStyleRef.current.trim() : '';
      const key = `${provider}:${voiceId}:${style}`;
      let sample = sampleCacheRef.current.get(key);
      if (!sample) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: SAMPLE_LINE, provider, voice: voiceId, ...(style && { style }) }),
        });
        if (isStale()) return;
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          fail(err.error || `Voice error ${res.status}.`);
          return;
        }
        const bytes = await res.arrayBuffer();
        if (isStale()) return;
        sample = { bytes, type: res.headers.get('Content-Type') || 'audio/wav', decoded: null };
        sampleCacheRef.current.set(key, sample);
      }

      if (ctx) {
        if (!sample.decoded) {
          // decodeAudioData empties the buffer it is given, so hand it a copy
          sample.decoded = await ctx.decodeAudioData(sample.bytes.slice(0));
          if (isStale()) return;
        }
        demoHandleRef.current = playTuned(ctx, sample.decoded, {
          speed: speedRef.current,
          fx: fxRef.current,
          live: true,
          onended: done,
        });
        return;
      }

      // No Web Audio in this browser: plain playback. Speed still works, tuning does not.
      const blobUrl = URL.createObjectURL(new Blob([sample.bytes], { type: sample.type }));
      const audio = new Audio(blobUrl);
      audio._blobUrl = blobUrl;
      audio.playbackRate = speedRef.current;
      demoAudioRef.current = audio;
      const finish = () => {
        if (demoAudioRef.current !== audio) return;
        URL.revokeObjectURL(blobUrl);
        demoAudioRef.current = null;
        setPlayingDemo(null);
      };
      audio.onended = audio.onerror = finish;
      audio.play().catch(finish);
    } catch (err) {
      fail(err?.message || 'Could not play that voice.');
    }
  }

  // Keep the refs current, and push equalizer + volume into a clip that is
  // already playing so dragging those sliders is heard immediately.
  useEffect(() => {
    fxRef.current = fx;
    demoHandleRef.current?.update(fx);
  }, [fx]);
  useEffect(() => { speedRef.current = voiceSpeed; }, [voiceSpeed]);
  useEffect(() => { qwStyleRef.current = qwStyle; }, [qwStyle]);

  // Speed and pitch are baked into the clip before it plays, so they can't be
  // bent mid-playback. Instead the test restarts once the slider settles. The
  // Browser voice can't change anything mid-sentence, so volume restarts it too.
  useEffect(() => {
    const prev = prevTuneRef.current;
    prevTuneRef.current = { speed: voiceSpeed, pitch: fx.pitch, volume: fx.volume };
    if (!prev || !playingDemo) return;
    const last = lastDemoRef.current;
    if (!last || last.previewUrl) return;
    const changed = prev.speed !== voiceSpeed || prev.pitch !== fx.pitch
      || (last.provider === 'browser' && prev.volume !== fx.volume);
    if (!changed) return;
    const timer = setTimeout(() => playDemo(last.voiceId, last.provider, null, { restart: true }), 350);
    return () => clearTimeout(timer);
  }, [voiceSpeed, fx.pitch, fx.volume]);

  function applyPreset(preset) {
    setFx(f => ({ ...f, pitch: preset.pitch, eq: [...preset.eq] }));
  }

  function resetTuning() {
    setVoiceSpeed(DEFAULT_TTS_SPEED);
    setFx(normalizeVoiceFx(null));
  }

  // ── Design a Voice ──────────────────────────────────────────────────
  async function handleDesignGenerate() {
    setDvGenerating(true);
    setDvError('');
    if (dvAudioUrl) URL.revokeObjectURL(dvAudioUrl);
    setDvAudioUrl(null);
    setDvVoiceId(null);
    try {
      const res = await fetch('/api/elevenlabs-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: dvDescription, gender: dvGender, age: dvAge, accent: dvAccent, accent_strength: dvAccentStrength, text: dvText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDvError(err.error || 'Generation failed.');
        return;
      }
      const generatedId = res.headers.get('X-Generated-Voice-Id') || '';
      const blob = new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' });
      setDvAudioUrl(URL.createObjectURL(blob));
      setDvVoiceId(generatedId);
    } catch (err) {
      setDvError(err.message || 'Something went wrong.');
    } finally {
      setDvGenerating(false);
    }
  }

  async function handleDesignSave() {
    if (!dvVoiceId || !dvName.trim()) return;
    setDvSaving(true);
    setDvError('');
    setDvSaved(false);
    try {
      const res = await fetch('/api/elevenlabs-save-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The same description the preview was made from (ElevenLabs needs it to save)
        body: JSON.stringify({
          voice_name: dvName, generated_voice_id: dvVoiceId,
          description: dvDescription, gender: dvGender, age: dvAge, accent: dvAccent, accent_strength: dvAccentStrength,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDvError(err.error || 'Save failed.');
        return;
      }
      const data = await res.json();
      setDvSaved(true);
      // Refresh voices and auto-select the new one
      const updated = await fetch('/api/elevenlabs-voices').then(r => r.json()).catch(() => ({}));
      if (updated.voices?.length) {
        setElVoices(updated.voices);
        setElVoice(data.voice_id);
      }
      setTimeout(() => setDvSaved(false), 4000);
    } catch (err) {
      setDvError(err.message || 'Something went wrong.');
    } finally {
      setDvSaving(false);
    }
  }

  function handleProviderChange(id) {
    setTtsProvider(id);
    if (id === 'elevenlabs') fetchElVoices();
  }

  const voiceMap     = { google: googleVoice, elevenlabs: elVoice, openai: oaVoice, orpheus: orVoice, qwen: qwVoice };
  const voiceSetters = { google: setGoogleVoice, elevenlabs: setElVoice, openai: setOaVoice, orpheus: setOrVoice, qwen: setQwVoice };
  const voiceLists   = { google: GOOGLE_VOICES, elevenlabs: elVoices, openai: OPENAI_VOICES, orpheus: ORPHEUS_VOICES, qwen: QWEN_VOICES };

  const isBrowserVoice = ttsProvider === 'browser';
  const activePreset   = matchingPreset(fx);
  // What the Test button plays: the voice currently selected for this provider
  const testVoiceId    = isBrowserVoice ? BROWSER_TEST_ID : voiceMap[ttsProvider];

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      {/* ── VOICE ENGINE ─────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Voice Engine</h2>
        <p className={styles.sectionDesc}>Which service reads AI responses aloud. All free.</p>

        <div className={styles.providerGrid}>
          {TTS_PROVIDERS.filter(p => !p.adminOnly || adminUnlocked).map(p => (
            <button
              key={p.id}
              className={`${styles.providerCard} ${ttsProvider === p.id ? styles.active : ''}`}
              onClick={() => handleProviderChange(p.id)}
            >
              <span className={styles.providerName}>{p.label}</span>
              <span className={styles.providerDesc}>{p.desc}</span>
            </button>
          ))}
        </div>

        {ttsProvider === 'browser' ? (
          <p className={styles.sectionDesc}>Browser uses your device&apos;s built-in voice automatically — no selection needed. Switch to Google for higher quality.</p>
        ) : (
          <div className={styles.voiceList}>
            {(voiceLists[ttsProvider] ?? []).map(v => (
              <button
                key={v.id}
                className={`${styles.voiceItem} ${voiceMap[ttsProvider] === v.id ? styles.voiceActive : ''}`}
                onClick={() => voiceSetters[ttsProvider](v.id)}
              >
                <span className={styles.voiceName}>
                  {v.name}
                  {v.note && <span className={styles.voiceNote}>{v.note}</span>}
                </span>
                <span
                  role="button"
                  className={`${styles.previewBtn} ${playingDemo === v.id ? styles.previewPlaying : ''}`}
                  onClick={e => { e.stopPropagation(); playDemo(v.id, ttsProvider, v.preview_url ?? null); }}
                >
                  {playingDemo === v.id ? '■ Stop' : '▶ Preview'}
                </span>
              </button>
            ))}
          </div>
        )}

        {ttsProvider === 'qwen' && (
          <div className={styles.designRow}>
            <p className={styles.designNote}>
              Every preview and every spoken reply uses one of your Space&apos;s few free generations for the day. A preview you have already played is kept until you leave this page, so playing it again is free.
            </p>
            <span className={styles.designLabel}>How to say it (optional)</span>
            <textarea
              className={styles.designTextarea}
              rows={2}
              placeholder="e.g. dry and sarcastic, a little tired"
              value={qwStyle}
              onChange={e => setQwStyle(e.target.value)}
              maxLength={300}
            />
            <p className={styles.designNote}>Leave it empty and each persona speaks in its own style.</p>
          </div>
        )}

        {ttsProvider === 'elevenlabs' && (
          <div className={styles.designSection}>
            <button className={styles.designHeader} onClick={() => setDvOpen(o => !o)}>
              <span className={styles.designTitle}>✦ Design Your Own Voice</span>
              <span className={styles.designChevron}>{dvOpen ? '▲' : '▼'}</span>
            </button>

            {dvOpen && (
              <div className={styles.designBody}>
                <p className={styles.designNote}>
                  Needs a paid ElevenLabs plan. Designed voices are saved to your ElevenLabs account and show up in the list above.
                </p>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>Describe the voice (optional — overrides the buttons below)</span>
                  <textarea
                    className={styles.designTextarea}
                    rows={3}
                    value={dvDescription}
                    onChange={e => { setDvDescription(e.target.value); setDvVoiceId(null); }}
                    maxLength={DESCRIPTION_MAX}
                    placeholder="e.g. A gravelly, sarcastic man in his 40s from Brooklyn, fast talker, smirking delivery"
                  />
                </div>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>Gender</span>
                  <div className={styles.designOptions}>
                    {['male', 'female'].map(g => (
                      <button key={g}
                        className={`${styles.designOption} ${dvGender === g ? styles.designOptionActive : ''}`}
                        onClick={() => setDvGender(g)}
                      >{g[0].toUpperCase() + g.slice(1)}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>Age</span>
                  <div className={styles.designOptions}>
                    {[['young', 'Young'], ['middle_aged', 'Middle'], ['old', 'Older']].map(([val, label]) => (
                      <button key={val}
                        className={`${styles.designOption} ${dvAge === val ? styles.designOptionActive : ''}`}
                        onClick={() => setDvAge(val)}
                      >{label}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>Accent</span>
                  <div className={styles.designOptions}>
                    {['american', 'british', 'australian', 'african', 'indian'].map(a => (
                      <button key={a}
                        className={`${styles.designOption} ${dvAccent === a ? styles.designOptionActive : ''}`}
                        onClick={() => setDvAccent(a)}
                      >{a[0].toUpperCase() + a.slice(1)}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>Accent Strength — {dvAccentStrength.toFixed(1)}</span>
                  <input
                    type="range" className={styles.designSlider}
                    min="0.3" max="2" step="0.1"
                    value={dvAccentStrength}
                    onChange={e => setDvAccentStrength(parseFloat(e.target.value))}
                  />
                </div>

                <div className={styles.designRow}>
                  <span className={styles.designLabel}>
                    Sample Text — {dvText.trim().length}/{SAMPLE_MIN} min
                  </span>
                  <textarea
                    className={styles.designTextarea}
                    rows={3}
                    value={dvText}
                    onChange={e => setDvText(e.target.value)}
                    maxLength={SAMPLE_MAX}
                  />
                </div>

                <button
                  className={styles.designGenBtn}
                  onClick={handleDesignGenerate}
                  disabled={dvGenerating || dvText.trim().length < SAMPLE_MIN}
                >
                  {dvGenerating ? 'Generating…' : 'Generate Preview'}
                </button>

                {dvAudioUrl && (
                  <>
                    <div className={styles.designPreviewRow}>
                      <button className={styles.designPlayBtn}
                        onClick={() => new Audio(dvAudioUrl).play().catch(() => {})}
                      >▶ Play Preview</button>
                      <span className={styles.designNote}>Happy with it? Name it and save.</span>
                    </div>
                    <div className={styles.designSaveRow}>
                      <input
                        className={styles.designNameInput}
                        type="text"
                        placeholder="Name this voice…"
                        value={dvName}
                        onChange={e => setDvName(e.target.value)}
                        maxLength={50}
                      />
                      <button
                        className={styles.designSaveBtn}
                        onClick={handleDesignSave}
                        disabled={dvSaving || !dvName.trim()}
                      >
                        {dvSaving ? 'Saving…' : dvSaved ? '✓ Saved!' : 'Save Voice'}
                      </button>
                    </div>
                  </>
                )}

                {dvError   && <p className={styles.designError}>{dvError}</p>}
                {dvSaved   && <p className={styles.designSuccess}>Voice saved and selected. It&apos;s now in your voice list above.</p>}
              </div>
            )}
          </div>
        )}

        <div className={styles.tuneSection}>
          <div className={styles.tuneHead}>
            <span className={styles.tuneTitle}>Voice Tuning</span>
            <button className={styles.tuneReset} onClick={resetTuning}>Reset</button>
          </div>

          <div className={styles.tunePresets}>
            {VOICE_FX_PRESETS.map(p => (
              <button
                key={p.id}
                className={`${styles.tunePreset} ${activePreset === p.id ? styles.tunePresetActive : ''}`}
                onClick={() => applyPreset(p)}
              >{p.label}</button>
            ))}
          </div>

          <TuneSlider
            label="Speed"
            display={`${voiceSpeed.toFixed(2)}×`}
            min={SPEED_MIN} max={SPEED_MAX} step={0.05}
            value={voiceSpeed}
            onChange={setVoiceSpeed}
          />
          <TuneSlider
            label="Pitch" hint="lower ↔ higher"
            display={fx.pitch === 0 ? 'Normal' : signed(fx.pitch)}
            min={-PITCH_RANGE} max={PITCH_RANGE} step={0.5}
            value={fx.pitch}
            onChange={v => setFx(f => ({ ...f, pitch: v }))}
          />
          <TuneSlider
            label="Volume"
            display={`${Math.round(fx.volume * 100)}%`}
            min={0} max={VOLUME_MAX} step={0.05}
            value={fx.volume}
            onChange={v => setFx(f => ({ ...f, volume: v }))}
          />

          <div className={styles.tuneEq}>
            <span className={styles.tuneGroupLabel}>Equalizer</span>
            {isBrowserVoice && (
              <p className={styles.designNote}>
                Not available for the Browser voice. Your device speaks it directly, so the app never gets the sound to filter. Switch to Google to use these.
              </p>
            )}
            {EQ_BANDS.map((band, i) => (
              <TuneSlider
                key={band.id}
                label={band.label} hint={band.hint}
                display={fx.eq[i] === 0 ? '0' : `${signed(fx.eq[i])} dB`}
                min={-EQ_RANGE_DB} max={EQ_RANGE_DB} step={1}
                value={fx.eq[i]}
                disabled={isBrowserVoice}
                onChange={v => setFx(f => ({ ...f, eq: f.eq.map((db, j) => (j === i ? v : db)) }))}
              />
            ))}
          </div>

          <button
            className={styles.designGenBtn}
            onClick={() => playDemo(testVoiceId, ttsProvider, null)}
            disabled={!testVoiceId}
          >
            {playingDemo && playingDemo === testVoiceId ? '■ Stop' : '▶ Test voice'}
          </button>
          {demoError && <p className={styles.designError}>{demoError}</p>}
          <p className={styles.designNote}>Tap Save Settings below to use this tuning in chat.</p>
        </div>
      </section>

      {/* ── VOICE INPUT / MODE ───────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Voice Input</h2>
        <p className={styles.sectionDesc}>How the mic behaves when you speak.</p>

        <div className={styles.modeGrid}>
          {VOICE_MODES.map(m => (
            <button
              key={m.id}
              className={`${styles.modeCard} ${voiceMode === m.id ? styles.active : ''}`}
              onClick={() => setVoiceMode(m.id)}
            >
              <span className={styles.modeName}>{m.label}</span>
              <span className={styles.modeDesc}>{m.desc}</span>
            </button>
          ))}
        </div>

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>AI voice responses</div>
            <div className={styles.toggleDesc}>Read AI replies aloud using the voice engine above.</div>
          </div>
          <button
            className={`${styles.toggle} ${aiVoice ? styles.toggleOn : ''}`}
            onClick={() => setAiVoice(v => !v)}
            aria-pressed={aiVoice}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </section>

      {/* ── SAVE ─────────────────────────────────────────────── */}
      <button className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`} onClick={handleSave}>
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>

      {/* ── MEMORY ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>AI Memory</h2>
        <p className={styles.sectionDesc}>
          Facts the AI remembers about you across conversations.
          These are injected into every chat — keep them short and relevant.
        </p>

        {memoryItems.length === 0 ? (
          <p className={styles.memEmpty}>No memory items yet.</p>
        ) : (
          <ul className={styles.memList}>
            {memoryItems.map((item, i) => (
              <li key={i} className={styles.memItem}>
                <span className={styles.memText}>{item}</span>
                <button
                  className={styles.memDelete}
                  onClick={() => handleRemoveMemory(i)}
                  aria-label="Remove"
                >✕</button>
              </li>
            ))}
          </ul>
        )}

        <form className={styles.memForm} onSubmit={handleAddMemory}>
          <input
            className={styles.memInput}
            type="text"
            placeholder={`e.g. "My name is Chris" or "I'm building a startup"`}
            value={memInput}
            onChange={e => setMemInput(e.target.value)}
            maxLength={200}
          />
          <button className={styles.memAddBtn} type="submit">Add</button>
        </form>

        {memoryItems.length > 0 && (
          <button className={styles.memClearBtn} onClick={handleClearMemory}>
            {memCleared ? '✓ Cleared' : 'Clear all memory'}
          </button>
        )}
      </section>

      {/* ── DATA ─────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Data</h2>

        <div className={styles.dataRow}>
          <div>
            <div className={styles.dataLabel}>Conversation history</div>
            <div className={styles.dataDesc}>
              {cleared ? 'History cleared.' : 'All saved conversations stored in this browser.'}
            </div>
          </div>
          <button
            className={`${styles.dangerBtn} ${clearConfirm ? styles.dangerConfirm : ''}`}
            onClick={handleClearHistory}
            onBlur={() => setClearConfirm(false)}
          >
            {clearConfirm ? 'Tap again to confirm' : 'Clear History'}
          </button>
        </div>

        <div className={styles.dataRow}>
          <div>
            <div className={styles.dataLabel}>Reset all settings</div>
            <div className={styles.dataDesc}>Clears all preferences, voice settings, and model choice.</div>
          </div>
          <button
            className={`${styles.dangerBtn} ${resetConfirm ? styles.dangerConfirm : ''}`}
            onClick={handleResetAll}
            onBlur={() => setResetConfirm(false)}
          >
            {resetConfirm ? 'Tap again to confirm' : 'Reset'}
          </button>
        </div>
      </section>

      {/* ── APP VERSION ──────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>App Version</h2>
        <p className={styles.sectionDesc}>Shows whether the newest code has actually reached this screen.</p>
        <BuildCheck />
      </section>

      {/* Admin unlock — the server checks the PIN and sets a signed cookie */}
      <div className={styles.adminRow}>
        {adminUnlocked ? (
          <button className={styles.adminBtn} onClick={() => {
            fetch('/api/admin-unlock', { method: 'DELETE' }).catch(() => {});
            setAdminUnlocked(false);
            if (TTS_PROVIDERS.find(p => p.id === ttsProvider)?.adminOnly) {
              setTtsProvider(DEFAULT_TTS_PROVIDER);
            }
          }}>
            Admin: ON — tap to lock
          </button>
        ) : (
          <button className={styles.adminBtn} onClick={async () => {
            const pin = window.prompt('Admin PIN:');
            if (pin === null) return;
            try {
              const res = await fetch('/api/admin-unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
              });
              const data = await res.json().catch(() => ({}));
              if (data.granted) {
                setAdminUnlocked(true);
                if (ttsProvider === 'elevenlabs') fetchElVoices();
              } else {
                window.alert(data.error || 'Incorrect PIN.');
              }
            } catch {
              window.alert('Could not reach server. Try again.');
            }
          }}>
            Admin unlock
          </button>
        )}
      </div>
    </main>
  );
}
