'use client';

import { useState, useEffect } from 'react';
import { MIN_MUSIC_SECONDS, MAX_MUSIC_SECONDS, validateMusicRequest } from '../../lib/music';
import styles from './music.module.css';

export default function MusicPage() {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [seconds, setSeconds] = useState('60');
  const [instrumental, setInstrumental] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [track, setTrack] = useState(null); // { url, name }

  useEffect(() => () => { if (track) URL.revokeObjectURL(track.url); }, [track]);

  async function generate() {
    const req = { prompt, lyrics, seconds: seconds === '' ? null : Number(seconds), instrumental };
    const problem = validateMusicRequest(req);
    if (problem) { setError(problem); return; }
    setError('');
    setRunning(true);
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status}).`);
      }
      const blob = await res.blob();
      const slug = prompt.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-$/, '');
      setTrack({ url: URL.createObjectURL(blob), name: `${slug || 'track'}.mp3` });
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main>
      <h1 className={styles.heading}>Music</h1>
      <p className={styles.sub}>
        Describe a song and ElevenLabs Music writes the instruments and the singing. Uses your ElevenLabs credits.
      </p>

      <section className={styles.section}>
        <label className={styles.label} htmlFor="music-prompt">Description</label>
        <textarea
          id="music-prompt"
          className={styles.input}
          rows={4}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Slow ancient Mesopotamian lament, lyre and frame drum, low female voice, sung in English, dark and echoing like a buried temple"
          disabled={running}
        />
      </section>

      <section className={styles.section}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={instrumental} onChange={e => setInstrumental(e.target.checked)} disabled={running} />
          Instrumental only (no singing)
        </label>
        {!instrumental && (
          <>
            <label className={styles.label} htmlFor="music-lyrics">Lyrics (optional — leave blank and it writes its own)</label>
            <textarea
              id="music-lyrics"
              className={styles.input}
              rows={8}
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder={'[Verse]\nUnder the dust the city sleeps…\n\n[Chorus]\n…'}
              disabled={running}
            />
          </>
        )}
      </section>

      <section className={styles.section}>
        <label className={styles.label} htmlFor="music-length">Length in seconds ({MIN_MUSIC_SECONDS}–{MAX_MUSIC_SECONDS}, blank = let it decide)</label>
        <input
          id="music-length"
          className={styles.length}
          type="number"
          min={MIN_MUSIC_SECONDS}
          max={MAX_MUSIC_SECONDS}
          value={seconds}
          onChange={e => setSeconds(e.target.value)}
          disabled={running}
        />
      </section>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={generate} disabled={running || !prompt.trim()}>
          {running ? 'Composing… (this can take a minute)' : 'Generate'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {track && (
        <section className={styles.section}>
          <audio controls src={track.url} className={styles.player} />
          <a className={styles.small} href={track.url} download={track.name}>Download MP3</a>
        </section>
      )}
    </main>
  );
}
