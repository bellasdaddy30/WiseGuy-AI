// Checks the API keys in .env.local without ever printing them.
//   npm run check-keys        -> report only
//   npm run check-keys -- --fix  -> also clean the file (whitespace, quotes,
//                                   Windows line endings, GOOGLE_ -> GEMINI_ name)
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { MODELS } from '../lib/models.js';

const ENV_FILE = new URL('../.env.local', import.meta.url);
const FIX = process.argv.includes('--fix');

const PROVIDERS = [
  { id: 'groq', name: 'GROQ_API_KEY', prefix: 'gsk_', label: 'Groq' },
  { id: 'google', name: 'GEMINI_API_KEY', alt: 'GOOGLE_API_KEY', prefix: 'AIza', label: 'Gemini' },
];

if (!existsSync(ENV_FILE)) {
  console.log('✗ .env.local not found in the project folder.');
  process.exit(1);
}

const raw = readFileSync(ENV_FILE, 'utf8');
const problems = [];
const vars = {};
const cleanedLines = [];

for (const line of raw.split('\n')) {
  const stripped = line.replace(/\r$/, '');
  if (stripped !== line) problems.push('Windows line ending found (invisible \\r).');
  const m = stripped.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!m) { cleanedLines.push(stripped); continue; }
  let [, key, value] = m;
  const original = value;
  value = value.trim().replace(/^["']|["']$/g, '').trim();
  if (value !== original) problems.push(`${key}: had spaces or quotes around the value.`);
  if (key === 'GOOGLE_API_KEY' && !/^GEMINI_API_KEY=/m.test(raw)) {
    problems.push('GOOGLE_API_KEY should be named GEMINI_API_KEY.');
    key = 'GEMINI_API_KEY';
  }
  vars[key] = value;
  cleanedLines.push(`${key}=${value}`);
}

const unique = [...new Set(problems)];
if (unique.length) {
  console.log(FIX ? 'Cleaned up:' : 'Formatting problems (run with -- --fix to clean):');
  unique.forEach(p => console.log('  - ' + p));
  if (FIX) {
    copyFileSync(ENV_FILE, new URL('../.env.local.bak', import.meta.url));
    writeFileSync(ENV_FILE, cleanedLines.join('\n'));
    console.log('  (backup saved as .env.local.bak)');
  }
  console.log();
}

async function listModels(p, key) {
  if (p.id === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body?.error?.message || `HTTP ${res.status}` };
    return { ids: (body.data || []).map(m => m.id) };
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1000`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body?.error?.message || `HTTP ${res.status}` };
  return { ids: (body.models || []).map(m => m.name.replace(/^models\//, '')) };
}

let allGood = true;
for (const p of PROVIDERS) {
  const key = vars[p.name] ?? (p.alt ? vars[p.alt] : undefined) ?? '';
  const shape = key ? `length ${key.length}, starts "${key.slice(0, 4)}"` : 'missing';
  console.log(`${p.label} (${p.name}): ${shape}`);

  if (!key) {
    console.log(`  ✗ Not in .env.local. Add a line: ${p.name}=<your key>\n`);
    allGood = false;
    continue;
  }
  if (!key.startsWith(p.prefix)) {
    console.log(`  ⚠ Expected it to start with "${p.prefix}". Probably the wrong value pasted.`);
  }

  let result;
  try {
    result = await listModels(p, key);
  } catch (err) {
    console.log(`  ✗ Couldn't reach ${p.label}: ${err.message}\n`);
    allGood = false;
    continue;
  }
  if (result.error) {
    console.log(`  ✗ ${p.label} rejected the key: ${result.error}`);
    console.log('    Make a new key and paste it (don\'t retype it).\n');
    allGood = false;
    continue;
  }

  console.log('  ✓ Key works.');
  for (const m of MODELS.filter(m => m.provider === p.id)) {
    const ok = result.ids.includes(m.id);
    if (!ok) allGood = false;
    console.log(`    ${ok ? '✓' : '✗'} ${m.id}${ok ? '' : '  (not available — remove from lib/models.js)'}`);
  }
  console.log();
}

console.log(allGood
  ? 'All good. Restart the dev server: Ctrl+C, then npm run dev -- --hostname 0.0.0.0'
  : 'Fix the ✗ items above, then run this again.');
process.exit(allGood ? 0 : 1);
