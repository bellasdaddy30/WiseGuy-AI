'use client';

import styles from './HistorySidebar.module.css';

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && now.getDate() === d.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistorySidebar({ open, onClose, history, activeId, onLoad, onNew, onDelete }) {
  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.header}>
          <span className={styles.title}>History</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <button className={styles.newBtn} onClick={onNew}>+ New Chat</button>
        <div className={styles.list}>
          {history.length === 0 && (
            <p className={styles.empty}>No saved conversations yet.</p>
          )}
          {history.map(conv => (
            <div
              key={conv.id}
              className={`${styles.item} ${conv.id === activeId ? styles.active : ''}`}
              onClick={() => onLoad(conv)}
            >
              <div className={styles.itemTitle}>{conv.title}</div>
              <div className={styles.itemMeta}>{formatDate(conv.updated)}</div>
              <button
                className={styles.deleteBtn}
                title="Delete"
                onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
