import styles from './ChatMessage.module.css';

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <span className={styles.label}>{isUser ? 'You' : 'SmartAss'}</span>
      <p className={styles.content}>{content}</p>
    </div>
  );
}
