export const MEMORY_KEY      = 'wiseguy_memory';
export const MAX_MEMORY_ITEMS = 20;

export function getMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMemory(items) {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(items)); } catch {}
}

export function addMemoryItem(text) {
  const trimmed = text.trim();
  if (!trimmed) return getMemory();
  const items = getMemory();
  if (items.some(i => i.toLowerCase() === trimmed.toLowerCase())) return items;
  const updated = [...items, trimmed].slice(-MAX_MEMORY_ITEMS);
  saveMemory(updated);
  return updated;
}

export function removeMemoryItem(index) {
  const items = getMemory();
  items.splice(index, 1);
  saveMemory([...items]);
  return [...items];
}

export function clearMemory() {
  try { localStorage.removeItem(MEMORY_KEY); } catch {}
}

// Returns a system-prompt string to inject, or null if memory is empty.
export function buildMemoryPrompt(items) {
  if (!items?.length) return null;
  return (
    'Things the user has told you to remember about them:\n' +
    items.map((f, i) => `${i + 1}. ${f}`).join('\n') +
    '\nWeave these in naturally when relevant. Never announce that you\'re remembering them.'
  );
}
