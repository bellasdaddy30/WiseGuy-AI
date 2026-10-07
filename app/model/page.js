'use client';

import { useState, useEffect } from 'react';
import { MODELS, DEFAULT_MODEL } from '../../lib/models';
import styles from './model.module.css';

const STORAGE_KEY = 'wiseguy_model';

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  groq: 'Groq',
  google: 'Google',
};

const PROVIDERS = [...new Set(MODELS.map(m => m.provider))];

export default function ModelPage() {
  const [selected, setSelected] = useState(DEFAULT_MODEL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && MODELS.some(m => m.id === stored)) setSelected(stored);
    } catch {}
  }, []);

  function handleSelect(id) {
    setSelected(id);
    setSaved(false);
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, selected);
    } catch {}
    setSaved(true);
  }

  return (
    <main>
      <h1 className={styles.heading}>Model</h1>
      <p className={styles.sub}>Choose the AI model used in Chat. Saved to this browser.</p>

      {PROVIDERS.map(provider => {
        const group = MODELS.filter(m => m.provider === provider);
        return (
          <div key={provider} className={styles.group}>
            <h2 className={styles.groupLabel}>{PROVIDER_LABELS[provider]}</h2>
            <div className={styles.grid}>
              {group.map(model => (
                <button
                  key={model.id}
                  className={`${styles.card} ${selected === model.id ? styles.active : ''}`}
                  onClick={() => handleSelect(model.id)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.name}>{model.name}</span>
                    <span className={styles.cost}>{model.cost}</span>
                  </div>
                  <p className={styles.desc}>{model.description}</p>
                  {model.default && <span className={styles.badge}>Default</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button
        className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
        onClick={handleSave}
        disabled={saved}
      >
        {saved ? '✓ Saved' : 'Save choice'}
      </button>
    </main>
  );
}
