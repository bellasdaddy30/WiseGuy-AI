'use client';

import { useState, useEffect } from 'react';
import { PERSONAS, DEFAULT_PERSONALITY, PERSONALITY_KEY } from '../../lib/personality';
import styles from './customize.module.css';

const TONE_LABELS       = ['Chill', 'Relaxed', 'Balanced', 'Direct', 'Intense'];
const HUMOR_LABELS      = ['Light', 'Mild', 'Funny', 'Very Funny', 'Sides Hurting'];
const LENGTH_LABELS     = ['Minimal', 'Brief', 'Moderate', 'Thorough', 'Detailed'];
const CREATIVITY_LABELS = ['Factual', 'Grounded', 'Balanced', 'Creative', 'Unbelievable'];

export default function CustomizePage() {
  const [settings, setSettings] = useState(DEFAULT_PERSONALITY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONALITY_KEY);
      if (stored) setSettings({ ...DEFAULT_PERSONALITY, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    try {
      localStorage.setItem(PERSONALITY_KEY, JSON.stringify(settings));
    } catch {}
    setSaved(true);
  }

  return (
    <main>
      <h1 className={styles.heading}>Customize</h1>
      <p className={styles.sub}>Shape how SmartAss AI talks to you. Saved to this browser.</p>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Persona</h2>
        <div className={styles.personaGrid}>
          {PERSONAS.map(p => (
            <button
              key={p.id}
              className={`${styles.personaCard} ${settings.persona === p.id ? styles.active : ''}`}
              onClick={() => update('persona', p.id)}
            >
              <span className={styles.personaName}>{p.name}</span>
              <span className={styles.personaDesc}>{p.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Personality Dials</h2>
        <Slider label="Tone"       value={settings.tone}       labels={TONE_LABELS}       onChange={v => update('tone', v)} />
        <Slider label="Humor"      value={settings.humor}      labels={HUMOR_LABELS}      onChange={v => update('humor', v)} />
        <Slider label="Length"     value={settings.length}     labels={LENGTH_LABELS}     onChange={v => update('length', v)} />
        <Slider label="Creativity" value={settings.creativity} labels={CREATIVITY_LABELS} onChange={v => update('creativity', v)} />

        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Sarcasm</span>
          <button
            className={`${styles.toggle} ${settings.sarcasm ? styles.toggleOn : ''}`}
            onClick={() => update('sarcasm', !settings.sarcasm)}
            aria-pressed={settings.sarcasm}
          >
            <span className={styles.toggleThumb} />
            <span className={styles.toggleText}>{settings.sarcasm ? 'On' : 'Off'}</span>
          </button>
        </div>
      </section>

      <button
        className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
        onClick={save}
        disabled={saved}
      >
        {saved ? '✓ Saved' : 'Save'}
      </button>
    </main>
  );
}

function Slider({ label, value, labels, onChange }) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderTop}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{labels[value - 1]}</span>
      </div>
      <div className={styles.sliderTrack}>
        <div className={styles.sliderLine}>
          <div className={styles.sliderFill} style={{ width: `${(value - 1) / 4 * 100}%` }} />
        </div>
        {[1, 2, 3, 4, 5].map(v => (
          <button
            key={v}
            className={`${styles.pip} ${value === v ? styles.pipActive : value > v ? styles.pipFilled : ''}`}
            onClick={() => onChange(v)}
            aria-label={`${label}: ${labels[v - 1]}`}
          />
        ))}
      </div>
      <div className={styles.sliderEnds}>
        <span>{labels[0]}</span>
        <span>{labels[4]}</span>
      </div>
    </div>
  );
}
