import styles from './PremiumBadge.module.css';

// Small inline PRO badge. Renders nothing in dev (isPremium always true) — visible
// only when the app is in production and the feature is locked behind a paywall.
export default function PremiumBadge({ className = '' }) {
  return (
    <span className={`${styles.badge} ${className}`}>PRO</span>
  );
}
