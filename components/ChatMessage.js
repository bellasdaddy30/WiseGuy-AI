import styles from './ChatMessage.module.css';
import { splitVoiceSegments } from '../lib/voiceTags';

// Hide a half-streamed tag like "[whis" until the rest arrives.
function renderAssistant(content) {
  const text = content.replace(/\[[a-z]*$/i, '');
  return splitVoiceSegments(text).map((seg, i) =>
    seg.style === 'whisper' ? <span key={i} className={styles.whisper}>{seg.text}</span>
    : seg.style === 'shout' ? <strong key={i} className={styles.shout}>{seg.text}</strong>
    : <span key={i}>{seg.text}</span>
  );
}

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <span className={styles.label}>{isUser ? 'You' : 'SmartAss'}</span>
      <p className={styles.content}>{isUser ? content : renderAssistant(content)}</p>
    </div>
  );
}
