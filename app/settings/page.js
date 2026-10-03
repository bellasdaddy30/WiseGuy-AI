'use client';

import { useState, useEffect } from 'react';
import {
  TTS_PROVIDER_KEY, TTS_VOICE_GOOGLE_KEY, TTS_VOICE_ELEVENLABS_KEY,
  TTS_VOICE_OPENAI_KEY, TTS_VOICE_ORPHEUS_KEY,
  DEFAULT_TTS_PROVIDER, DEFAULT_GOOGLE_VOICE, DEFAULT_ELEVENLABS_VOICE,
  DEFAULT_OPENAI_VOICE, DEFAULT_ORPHEUS_VOICE,
  GOOGLE_VOICES, OPENAI_VOICES, ORPHEUS_VOICES,
  VOICE_MODE_KEY, AI_VOICE_KEY, HANDS_FREE_KEY,
} from '../../lib/tts';
import { MODEL_KEY, MODELS, DEFAULT_MODEL } from '../../lib/models';
import { clearHistory } from '../../lib/history';
import { PERSONALITY_KEY } from '../../lib/personality';
import styles from './settings.module.css';

const TTS_PROVIDERS = [
  { id: 'browser',    label: 'Browser',    desc: 'Free, built-in, works everywhere. Limited voice quality.' },
  { id: 'google',     label: 'Google',     desc: 'High quality. Uses your Gemini API key.' },
  { id: 'elevenlabs', label: 'ElevenLabs', desc: 'Most expressive. Uses your ElevenLabs credits.' },
  { id: 'openai',     label: 'OpenAI',     desc: 'Very natural. Uses your OpenAI API credits.' },
  { id: 'orpheus',    label: 'Orpheus',    desc: 'Emotion-reactive. Uses your Groq API key.' },
];

const VOICE_MODES = [
  { id: 'off',       label: 'Off',          desc: 'No voice. Text only.' },
  { id: 'push',      label: 'Push to Talk', desc: 'Hold the mic button to record.' },
  { id: 'auto',      label: 'Auto Send',    desc: 'Tap mic, speak, releases automatically.' },
  { id: 'handsfree', label: 'Hands Free',   desc: 'AI listens again after each response.' },
];

const CAT_LABEL = {
  professional: 'Professional',
  premade:      'Premade',
  cloned:       'Cloned',
  generated:    'Generated',
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

export default function SettingsPage() {
  const [ttsProvider,   setTtsProvider]   = useState(DEFAULT_TTS_PROVIDER);
  const [googleVoice,   setGoogleVoice]   = useState(DEFAULT_GOOGLE_VOICE);
  const [elVoice,       setElVoice]       = useState(DEFAULT_ELEVENLABS_VOICE);
  const [oaVoice,       setOaVoice]       = useState(DEFAULT_OPENAI_VOICE);
  const [orVoice,       setOrVoice]       = useState(DEFAULT_ORPHEUS_VOICE);
  const [aiVoice,       setAiVoice]       = useState(true);
  const [voiceMode,     setVoiceMode]     = useState('off');
  const [clearConfirm,  setClearConfirm]  = useState(false);
  const [cleared,       setCleared]       = useState(false);
  const [resetConfirm,  setResetConfirm]  = useState(false);
  const [saved,         setSaved]         = useState(false);

  // ElevenLabs dynamic voice list
  const [elVoices,      setElVoices]      = useState(null); // null = not yet loaded
  const [elLoading,     setElLoading]     = useState(false);
  const [elError,       setElError]       = useState('');

  useEffect(() => {
    setTtsProvider(load(TTS_PROVIDER_KEY, DEFAULT_TTS_PROVIDER));
    setGoogleVoice(load(TTS_VOICE_GOOGLE_KEY, DEFAULT_GOOGLE_VOICE));
    setElVoice(load(TTS_VOICE_ELEVENLABS_KEY, DEFAULT_ELEVENLABS_VOICE));
    setOaVoice(load(TTS_VOICE_OPENAI_KEY, DEFAULT_OPENAI_VOICE));
    setOrVoice(load(TTS_VOICE_ORPHEUS_KEY, DEFAULT_ORPHEUS_VOICE));
    setAiVoice(load(AI_VOICE_KEY, 'true') === 'true');
    const hf = load(HANDS_FREE_KEY, 'false') === 'true';
    setVoiceMode(hf ? 'handsfree' : load(VOICE_MODE_KEY, 'off'));
  }, []);

  // Fetch ElevenLabs voices when ElevenLabs is selected
  useEffect(() => {
    if (ttsProvider !== 'elevenlabs' || elVoices !== null) return;
    setElLoading(true);
    setElError('');
    fetch('/api/elevenlabs-voices')
      .then(r => r.json())
      .then(data => {
        if (!data.voices?.length) {
          setElError('No voices returned — check your ElevenLabs API key.');
          setElVoices([]);
        } else {
          setElVoices(data.voices);
          // If current saved voice isn't in the list, reset to first available
          if (!data.voices.some(v => v.id === elVoice)) {
            setElVoice(data.voices[0].id);
          }
        }
      })
      .catch(() => {
        setElError('Could not load voices. Check your connection.');
        setElVoices([]);
      })
      .finally(() => setElLoading(false));
  }, [ttsProvider]);

  function handleSave() {
    save(TTS_PROVIDER_KEY, ttsProvider);
    save(TTS_VOICE_GOOGLE_KEY, googleVoice);
    save(TTS_VOICE_ELEVENLABS_KEY, elVoice);
    save(TTS_VOICE_OPENAI_KEY, oaVoice);
    save(TTS_VOICE_ORPHEUS_KEY, orVoice);
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
      localStorage.removeItem(AI_VOICE_KEY);
      localStorage.removeItem(VOICE_MODE_KEY);
      localStorage.removeItem(HANDS_FREE_KEY);
      localStorage.removeItem(MODEL_KEY);
      localStorage.removeItem(PERSONALITY_KEY);
    } catch {}
    setResetConfirm(false);
    setTtsProvider(DEFAULT_TTS_PROVIDER);
    setGoogleVoice(DEFAULT_GOOGLE_VOICE);
    setElVoice(DEFAULT_ELEVENLABS_VOICE);
    setOaVoice(DEFAULT_OPENAI_VOICE);
    setOrVoice(DEFAULT_ORPHEUS_VOICE);
    setAiVoice(true);
    setVoiceMode('off');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const voiceMap     = { google: googleVoice, openai: oaVoice, orpheus: orVoice };
  const voiceSetters = { google: setGoogleVoice, openai: setOaVoice, orpheus: setOrVoice };
  const voiceLists   = { google: GOOGLE_VOICES, openai: OPENAI_VOICES, orpheus: ORPHEUS_VOICES };

  // Build grouped <optgroup> elements for ElevenLabs
  function renderElVoiceOptions() {
    if (!elVoices?.length) return null;
    const groups = {};
    for (const v of elVoices) {
      const cat = v.category ?? 'premade';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    }
    const catOrder = ['professional', 'premade', 'cloned', 'generated'];
    return catOrder
      .filter(c => groups[c]?.length)
      .map(c => (
        <optgroup key={c} label={CAT_LABEL[c] ?? c}>
          {groups[c].map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </optgroup>
      ));
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      {/* ── VOICE ENGINE ─────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Voice Engine</h2>
        <p className={styles.sectionDesc}>Which service reads AI responses aloud.</p>

        <div className={styles.providerGrid}>
          {TTS_PROVIDERS.map(p => (
            <button
              key={p.id}
              className={`${styles.providerCard} ${ttsProvider === p.id ? styles.active : ''}`}
              onClick={() => setTtsProvider(p.id)}
            >
              <span className={styles.providerName}>{p.label}</span>
              <span className={styles.providerDesc}>{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Voice picker for non-browser providers */}
        {ttsProvider !== 'browser' && (
          <div className={styles.voiceRow}>
            <label className={styles.voiceLabel}>
              {TTS_PROVIDERS.find(p => p.id === ttsProvider)?.label} Voice
            </label>

            {ttsProvider === 'elevenlabs' ? (
              elLoading ? (
                <span className={styles.voiceLoading}>Loading voices…</span>
              ) : elError ? (
                <span className={styles.voiceError}>{elError}</span>
              ) : (
                <select
                  className={styles.select}
                  value={elVoice}
                  onChange={e => setElVoice(e.target.value)}
                >
                  {renderElVoiceOptions()}
                </select>
              )
            ) : (
              <select
                className={styles.select}
                value={voiceMap[ttsProvider]}
                onChange={e => voiceSetters[ttsProvider](e.target.value)}
              >
                {voiceLists[ttsProvider]?.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
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
    </main>
  );
}
