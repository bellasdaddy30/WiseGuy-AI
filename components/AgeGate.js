'use client';

import { useEffect, useState } from 'react';
import styles from './AgeGate.module.css';

// One-time 18+ confirmation. This is self-attestation only — it records that
// the visitor clicked "I'm 18 or older" on this device. It is NOT age
// verification and should not be described as such.
const AGE_KEY = 'wiseguy_age_ok';

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { setShow(localStorage.getItem(AGE_KEY) !== '1'); } catch { setShow(true); }
  }, []);

  if (!show) return null;

  function confirm() {
    try { localStorage.setItem(AGE_KEY, '1'); } catch {}
    setShow(false);
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="age-title">
      <div className={styles.card}>
        <h2 id="age-title" className={styles.title}>Adults only</h2>
        <p className={styles.text}>
          WiseGuy AI uses explicit language, and some personas include adult and romantic roleplay.
          You must be 18 or older to use it.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={confirm}>I&apos;m 18 or older</button>
          <a className={styles.secondary} href="https://www.google.com">Leave</a>
        </div>
      </div>
    </div>
  );
}
