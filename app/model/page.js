'use client';

import { useState, useEffect } from 'react';
import { MODELS, DEFAULT_MODEL } from '../../lib/models';
import styles from './model.module.css';

const STORAGE_KEY = 'smartass_model';

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  groq: 'Groq',
  google: 'Google',
};

const PROVIDERS = ['groq', 'google', 'openai'];

export default function ModelPage() {
  const [selected, setSelected] = useState(DEFAULT_MODEL);
  const [saved, setSaved] = useState(false);
  const [ollama, setOllama] = useState(null); // null = loading, { running, models }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (MODELS.some(m => m.id === stored) || stored.startsWith('ollama::'))) {
        setSelected(stored);
      }
    } catch {}

    fetch('/api/ollama-models')
      .then(r => r.json())
      .then(data => setOllama(data))
      .catch(() => setOllama({ running: false }));
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

      <div className={styles.group}>
        <h2 className={styles.groupLabel}>Ollama (Local)</h2>
        {ollama === null && (
          <p className={styles.sub}>Checking for Ollama…</p>
        )}
        {ollama && !ollama.running && (
          <div className={styles.ollamaNotice}>
            <p>Ollama isn't running. Install it and pull a model to use local, uncensored AI.</p>
            <pre className={styles.ollamaCmd}>curl -fsSL https://ollama.com/install.sh | sh</pre>
            <pre className={styles.ollamaCmd}>ollama pull dolphin-mixtral</pre>
            <pre className={styles.ollamaCmd}>ollama serve</pre>
            <p className={styles.ollamaTip}>
              Recommended uncensored models: <strong>dolphin-mixtral</strong>, <strong>dolphin-llama3</strong>, <strong>mistral-nemo</strong>
            </p>
          </div>
        )}
        {ollama && ollama.running && ollama.models.length === 0 && (
          <div className={styles.ollamaNotice}>
            <p>Ollama is running but no models are installed yet.</p>
            <pre className={styles.ollamaCmd}>ollama pull dolphin-mixtral</pre>
          </div>
        )}
        {ollama && ollama.running && ollama.models.length > 0 && (
          <div className={styles.grid}>
            {ollama.models.map(m => {
              const storedId = `ollama::${m.id}`;
              return (
                <button
                  key={m.id}
                  className={`${styles.card} ${selected === storedId ? styles.active : ''}`}
                  onClick={() => handleSelect(storedId)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.name}>{m.name}</span>
                    <span className={styles.cost}>Local</span>
                  </div>
                  <p className={styles.desc}>
                    {m.size ? `${m.size} · ` : ''}Runs on your machine. No data leaves your network.
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
