const HISTORY_KEY = 'smartass_history';
const MAX_CONVS   = 50;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveConversation(conv) {
  try {
    const history = loadHistory();
    const idx = history.findIndex(c => c.id === conv.id);
    if (idx >= 0) {
      history[idx] = conv;
    } else {
      history.unshift(conv);
      if (history.length > MAX_CONVS) history.splice(MAX_CONVS);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function deleteConversation(id) {
  try {
    const history = loadHistory().filter(c => c.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function makeConvId() {
  return 'conv_' + Date.now();
}

export function convTitle(messages) {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New conversation';
  return first.content.length > 60
    ? first.content.slice(0, 60) + '…'
    : first.content;
}
