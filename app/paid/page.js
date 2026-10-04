'use client';

import Link from 'next/link';
import { PLANS, PLAN_FEATURES, isPersonaPro, isPersonaCompanion, isTtsPro } from '../../lib/premium';
import { PERSONAS } from '../../lib/personality';
import styles from './paid.module.css';

const TTS_ENGINES = [
  { id: 'browser', label: 'Browser TTS', desc: 'Built-in. Free, works everywhere.',      pro: false },
  { id: 'google',  label: 'Google TTS',  desc: 'High quality. Free via Gemini key.',     pro: false },
  { id: 'orpheus', label: 'Orpheus TTS', desc: 'Emotion-reactive. Free via Groq key.',   pro: false },
];

export default function PaidPage() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <span className={styles.betaBadge}>Beta — All Features Free</span>
        <h1 className={styles.title}>Upgrade WiseGuy AI</h1>
        <p className={styles.subtitle}>
          The full experience — every persona, every voice engine, no limits.
        </p>
      </div>

      {/* ── Pricing cards ──────────────────────────────── */}
      <div className={styles.planGrid}>
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.highlight ? styles.planHighlight : ''} ${plan.addon ? styles.planAddon : ''}`}
          >
            {plan.highlight && <div className={styles.planPill}>Most Popular</div>}
            {plan.addon && <div className={styles.planPill} style={{ background: '#e879a0' }}>Add-on</div>}
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
              <Link href="/chat" className={styles.ctaPrimary}>
                Try Free During Beta →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* ── Persona breakdown ──────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>All Personas</h2>
        <div className={styles.personaGrid}>
          {PERSONAS.map(p => {
            const pro       = isPersonaPro(p.id);
            const companion = isPersonaCompanion(p.id);
            return (
              <div key={p.id} className={`${styles.personaItem} ${pro ? styles.personaPro : ''} ${companion ? styles.personaCompanion : ''}`}>
                <div className={styles.personaItemHeader}>
                  <span className={styles.personaItemName}>{p.name}</span>
                  {companion
                    ? <span className={styles.companionBadge}>ADD-ON</span>
                    : pro
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
              <div>
                <div className={styles.ttsName}>{e.label}</div>
                <div className={styles.ttsDesc}>{e.desc}</div>
              </div>
              {e.pro
                ? <span className={styles.proBadge}>PRO</span>
                : <span className={styles.freeBadge}>FREE</span>
              }
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        Billing coming soon. Everything is unlocked during beta — enjoy it.
      </p>
    </main>
  );
}
