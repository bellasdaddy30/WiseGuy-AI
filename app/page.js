import Link from 'next/link';
import { isPersonaPro } from '../lib/premium';
import styles from './page.module.css';

const features = [
  {
    icon: '🎭',
    title: '15 Distinct Personalities',
    desc: 'WiseGuy, Unfiltered, Evil Genius, Philosopher, Coach, and ten more — each with real differences in how they talk, think, and hit.',
  },
  {
    icon: '🎙️',
    title: 'Voice, Both Ways',
    desc: 'Speak your messages and hear the responses. Five TTS engines from browser-native to ElevenLabs. Hands-free mode included.',
  },
  {
    icon: '🧠',
    title: 'Multi-Model',
    desc: 'GPT-4o, Gemini, Groq, and more. Swap the brain without losing your persona settings.',
  },
];

const personas = [
  { id: 'wiseguy',       label: 'WiseGuy',        emoji: '😏' },
  { id: 'unfiltered',    label: 'Unfiltered',      emoji: '🔥' },
  { id: 'roast_master',  label: 'Roast Master',    emoji: '🎤' },
  { id: 'hype_man',      label: 'Hype Man',        emoji: '🙌' },
  { id: 'evil_genius',   label: 'Evil Genius',     emoji: '🧬' },
  { id: 'philosopher',   label: 'Philosopher',     emoji: '🪐' },
  { id: 'therapist',     label: 'Therapist',       emoji: '🛋️' },
  { id: 'coach',         label: 'Coach',           emoji: '💪' },
  { id: 'street_smart',  label: 'Street Smart',    emoji: '🌆' },
  { id: 'conspiracy_nut',label: 'Conspiracy Nut',  emoji: '👁️' },
  { id: 'comedian',      label: 'Comedian',        emoji: '😂' },
  { id: 'pirate',        label: 'Pirate',          emoji: '☠️' },
  { id: 'girlfriend',    label: 'Girlfriend',      emoji: '💕' },
  { id: 'boyfriend',     label: 'Boyfriend',       emoji: '💙' },
  { id: 'professional',  label: 'Professional',    emoji: '💼' },
];

export default function Home() {
  return (
    <main className={styles.page}>

      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>15 Personalities · 5 Voice Engines · Multi-Model</span>
          <h1 className={styles.headline}>
            <span className={styles.headlineWise}>Wise</span><span className={styles.headlineGuy}>Guy</span> AI
          </h1>
          <p className={styles.tagline}>
            Real talk, no corporate tone. An AI with actual personality — you pick which one.
          </p>
          <div className={styles.ctas}>
            <Link href="/chat" className={styles.ctaPrimary}>Start Chatting →</Link>
            <Link href="/customize" className={styles.ctaSecondary}>Explore Personas</Link>
          </div>
        </div>
        <div className={styles.scrollHint} aria-hidden="true">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <rect x="1" y="1" width="14" height="18" rx="7" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="6" r="2" fill="currentColor"/>
          </svg>
          Scroll
        </div>
      </section>

      {/* ── Features ─────────────────────────── */}
      <div className={styles.features}>
        {features.map(f => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Persona strip ─────────────────────── */}
      <section className={styles.personas}>
        <span className={styles.sectionEyebrow}>Personas</span>
        <h2 className={styles.sectionTitle}>A different energy for every conversation</h2>
        <div className={styles.personaStrip}>
          {personas.map(p => (
            <Link key={p.id} href="/customize" className={styles.personaChip}>
              <span className={styles.personaChipEmoji}>{p.emoji}</span>
              {p.label}
              {isPersonaPro(p.id) && <span className={styles.personaChipPro}>PRO</span>}
            </Link>
          ))}
        </div>
        <Link href="/customize" className={styles.sectionLink}>
          Explore &amp; customize personas →
        </Link>
      </section>

      <div className={styles.divider} />

      {/* ── Pro teaser ─────────────────────────── */}
      <div className={styles.proTeaser}>
        <span className={styles.proTeaserBadge}>Pro</span>
        <h3 className={styles.proTeaserTitle}>Unlock the full roster</h3>
        <p className={styles.proTeaserDesc}>
          All 15 personas, ElevenLabs voices, OpenAI TTS, and Orpheus — one plan, everything included.
        </p>
        <Link href="/paid" className={styles.proTeaserBtn}>See what's in Pro →</Link>
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>WiseGuy AI</span>
        <span className={styles.footerNote}>Your settings live in this browser. No account required.</span>
      </footer>

    </main>
  );
}
