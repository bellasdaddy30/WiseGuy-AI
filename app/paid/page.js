'use client';

import Link from 'next/link';
import { PLANS, PLAN_FEATURES, FREE_PERSONAS, isPersonaPro, isTtsPro } from '../../lib/premium';
import { PERSONAS } from '../../lib/personality';
import styles from './paid.module.css';

const TTS_ENGINES = [
  { id: 'browser',    label: 'Browser TTS',    pro: false },
  { id: 'google',     label: 'Google TTS',      pro: false },
  { id: 'elevenlabs', label: 'ElevenLabs TTS',  pro: true },
  { id: 'openai',     label: 'OpenAI TTS',      pro: true },
  { id: 'orpheus',    label: 'Orpheus TTS',      pro: true },
];

export default function PaidPage() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upgrade SmartAss AI</h1>
        <p className={styles.subtitle}>
          The full experience — every persona, every voice engine, no limits.
        </p>
      </div>

      {/* ── Pricing cards ──────────────────────────────────── */}
      <div className={styles.planGrid}>
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''}`}
          >
            {plan.highlight && <div className={styles.planPill}>Most Popular</div>}
            <div className={styles.planName}>{plan.label}</div>
            <div className={styles.planPriceRow}>
              <span className={styles.planPrice}>{plan.price}</span>
              {plan.period && <span className={styles.planPeriod}>{plan.period}</span>}
            </div>
            <p className={styles.planDesc}>{plan.description}</p>
            <ul className={styles.featureList}>
              {PLAN_FEATURES[plan.id].map(f => (
                <li key={f} className={styles.featureItem}>
                  <span className={styles.check}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === 'free' ? (
              <Link href="/chat" className={styles.ctaSecondary}>
                {plan.cta}
              </Link>
            ) : (
              <button className={styles.ctaPrimary} disabled>
                {plan.cta} — Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Persona breakdown ──────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Personas</h2>
        <div className={styles.personaGrid}>
          {PERSONAS.map(p => {
            const pro = isPersonaPro(p.id);
            return (
              <div key={p.id} className={`${styles.personaItem} ${pro ? styles.personaPro : ''}`}>
                <div className={styles.personaItemHeader}>
                  <span className={styles.personaItemName}>{p.name}</span>
                  {pro
                    ? <span className={styles.proBadge}>PRO</span>
                    : <span className={styles.freeBadge}>FREE</span>
                  }
                </div>
                <span className={styles.personaItemDesc}>{p.description}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Voice engine breakdown ─────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Voice Engines</h2>
        <div className={styles.ttsGrid}>
          {TTS_ENGINES.map(e => (
            <div key={e.id} className={`${styles.ttsItem} ${e.pro ? styles.ttsPro : ''}`}>
              <span className={styles.ttsName}>{e.label}</span>
              {e.pro
                ? <span className={styles.proBadge}>PRO</span>
                : <span className={styles.freeBadge}>FREE</span>
              }
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        Payments not yet live. Pro features are fully unlocked during development.
      </p>
    </main>
  );
}
