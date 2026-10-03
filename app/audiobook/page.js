'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AUDIOBOOK_VOICES_KEY, AUDIOBOOK_TAGS_KEY, buildChunks, missingVoices, validateChapter, isVoiceId, lineText,
} from '../../lib/audiobook';
import styles from './audiobook.module.css';

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

async function renderChunk(inputs, signal) {
  const res = await fetch('/api/audiobook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Render failed (${res.status}).`);
  }
  return res.blob();
}

export default function AudiobookPage() {
  const [chapter, setChapter] = useState(null);
  const [fileError, setFileError] = useState('');
  const [voices, setVoices] = useState([]);
  const [voiceMap, setVoiceMap] = useState({});
  const [useTags, setUseTags] = useState(true);
  const [parts, setParts] = useState([]);        // rendered chunk blobs, in order
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState('');
  const abortRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    setVoiceMap(loadJson(AUDIOBOOK_VOICES_KEY, {}));
    setUseTags(loadJson(AUDIOBOOK_TAGS_KEY, true));
    fetch('/api/elevenlabs-voices?all=1')
      .then(r => r.json())
      .then(d => setVoices(d.voices ?? []))
      .catch(() => {});
  }, []);

  const speakers = useMemo(() => {
    if (!chapter) return [];
    const counts = {};
    for (const l of chapter.lines) counts[l.speaker] = (counts[l.speaker] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [chapter]);

  const chunks = useMemo(
    () => (chapter ? buildChunks(chapter.lines, voiceMap, useTags) : []),
    [chapter, voiceMap, useTags]
  );
  const missing = chapter ? missingVoices(speakers.map(s => s[0]), voiceMap) : [];
  const chars = chunks.reduce((n, c) => n + c.chars, 0);
  const done = parts.length;

  const fullUrl = useMemo(
    () => (done ? URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' })) : null),
    [parts, done]
  );
  useEffect(() => () => { if (fullUrl) URL.revokeObjectURL(fullUrl); }, [fullUrl]);

  async function openFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    try {
      const doc = JSON.parse(await file.text());
      const err = validateChapter(doc);
      if (err) throw new Error(err);
      setChapter(doc);
      setParts([]);
      setStatus('');
    } catch (err) {
      setChapter(null);
      setFileError(err.message || "That file isn't a chapter export.");
    }
  }

  function setVoice(speaker, id) {
    const next = { ...voiceMap, [speaker]: id.trim() };
    setVoiceMap(next);
    saveJson(AUDIOBOOK_VOICES_KEY, next);
    setParts([]); // chunk layout depends on voices; start fresh
  }

  function toggleTags(on) {
    setUseTags(on);
    saveJson(AUDIOBOOK_TAGS_KEY, on);
    setParts([]);
  }

  async function testVoice(speaker) {
    const line = chapter.lines.find(l => l.speaker === speaker && l.text.length > 20)
      ?? chapter.lines.find(l => l.speaker === speaker);
    if (!line || !isVoiceId(voiceMap[speaker])) return;
    setTesting(speaker);
    try {
      const blob = await renderChunk([{ text: lineText(line, useTags).slice(0, 300), voice_id: voiceMap[speaker] }]);
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setTesting('');
    }
  }

  async function render() {
    const remaining = chunks.slice(done);
    const remainingChars = remaining.reduce((n, c) => n + c.chars, 0);
    if (!window.confirm(`Render ${remaining.length} chunk(s), about ${remainingChars.toLocaleString()} characters of ElevenLabs credit?`)) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    let got = [...parts];
    try {
      for (let i = done; i < chunks.length; i++) {
        setStatus(`Rendering chunk ${i + 1} of ${chunks.length}…`);
        const blob = await renderChunk(chunks[i].inputs, controller.signal);
        got = [...got, blob];
        setParts(got);
      }
      setStatus('Chapter finished.');
    } catch (err) {
      setStatus(err.name === 'AbortError'
        ? `Stopped after chunk ${got.length}. Press Continue to pick up from there.`
        : `${err.message} Finished chunks are kept — press Continue to retry.`);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function download() {
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `${chapter.chapterKey || 'chapter'}${done < chunks.length ? '-partial' : ''}.mp3`;
    a.click();
  }

  return (
    <main>
      <h1 className={styles.heading}>Audiobook</h1>
      <p className={styles.sub}>
        Load a chapter exported by Ashen Voice Studio (<code>book-data/elevenlabs/*.json</code>), give each
        character an ElevenLabs voice, and render it with eleven_v3. Uses your ElevenLabs credits.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>Chapter</h2>
        <input type="file" accept=".json,application/json" onChange={openFile} disabled={running} />
        {fileError && <p className={styles.error}>{fileError}</p>}
        {chapter && (
          <p className={styles.meta}>
            <strong>{chapter.title}</strong> · {chapter.lines.length} lines · {chars.toLocaleString()} characters
            (≈ {chars.toLocaleString()} credits on eleven_v3) · {chunks.length} chunks
          </p>
        )}
      </section>

      {chapter && (
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Cast</h2>
          <label className={styles.toggle}>
            <input type="checkbox" checked={useTags} onChange={e => toggleTags(e.target.checked)} disabled={running} />
            Send audio tags like [whispers] (eleven_v3 performs them instead of reading them)
          </label>
          <div className={styles.cast}>
            {speakers.map(([speaker, count]) => {
              const id = voiceMap[speaker] ?? '';
              const known = voices.some(v => v.id === id);
              return (
                <div key={speaker} className={styles.castRow}>
                  <span className={styles.speaker}>{speaker} <em>{count}</em></span>
                  <select value={known ? id : ''} onChange={e => setVoice(speaker, e.target.value)} disabled={running}>
                    <option value="">{voices.length ? 'Pick a voice…' : 'No voices loaded'}</option>
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>{v.name}{v.category !== 'premade' ? ` (${v.category})` : ''}</option>
                    ))}
                  </select>
                  <input
                    className={styles.voiceId}
                    placeholder="or paste voice ID"
                    value={id}
                    onChange={e => setVoice(speaker, e.target.value)}
                    disabled={running}
                  />
                  <button
                    className={styles.small}
                    onClick={() => testVoice(speaker)}
                    disabled={running || !!testing || !isVoiceId(id)}
                  >
                    {testing === speaker ? '…' : 'Test'}
                  </button>
                </div>
              );
            })}
          </div>
          {missing.length > 0 && (
            <p className={styles.error}>Needs a voice: {missing.join(', ')}</p>
          )}
        </section>
      )}

      {chapter && (
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Render</h2>
          <div className={styles.actions}>
            {!running && (
              <button className={styles.primary} onClick={render} disabled={missing.length > 0 || done >= chunks.length}>
                {done === 0 ? 'Render chapter' : done < chunks.length ? `Continue (chunk ${done + 1})` : 'Rendered'}
              </button>
            )}
            {running && <button className={styles.primary} onClick={() => abortRef.current?.abort()}>Stop</button>}
            {done > 0 && !running && (
              <>
                <button className={styles.small} onClick={download}>
                  Download MP3{done < chunks.length ? ' (partial)' : ''}
                </button>
                <button className={styles.small} onClick={() => { setParts([]); setStatus(''); }}>Start over</button>
              </>
            )}
          </div>
          <progress className={styles.progress} value={done} max={chunks.length || 1} />
          <p className={styles.meta}>{done} / {chunks.length} chunks{status ? ` — ${status}` : ''}</p>
          {fullUrl && <audio ref={audioRef} controls src={fullUrl} className={styles.player} />}
          <p className={styles.hint}>Keep this tab open while rendering. Finished audio lives in this tab until you download it.</p>
        </section>
      )}
    </main>
  );
}
