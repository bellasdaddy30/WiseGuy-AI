'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from '../../components/ChatMessage';
import { MODELS, DEFAULT_MODEL } from '../../lib/models';
import styles from './chat.module.css';

const ERROR_REPLY = "The AI service isn't responding right now. Check the API key in .env.local and try again.";
const MODEL_KEY = 'smartass_model';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Oh good, you're here. Ask me something." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_KEY);
      if (stored) setModel(stored);
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Add an empty assistant bubble that we'll fill as the stream arrives
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], model }),
      });

      if (!res.ok) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: ERROR_REPLY };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.thread}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className={styles.typing}>
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.modelBadge}>
        {MODELS.find(m => m.id === model)?.name ?? model}
      </div>

      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          rows={1}
          disabled={loading}
        />
        <button className={styles.sendBtn} type="submit" disabled={loading || !input.trim()}>
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
