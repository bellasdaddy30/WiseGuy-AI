// Server-only admin lock for the features that spend real money (paid voices,
// voice design). Never import this from a client component.
//
// How it works:
//   1. The owner types ADMIN_PIN on the Settings page.
//   2. /api/admin-unlock checks it and sets a signed, httpOnly cookie.
//   3. Every paid API route calls isAdmin(request) and refuses without it.
//
// The cookie is signed with AUTH_SECRET (already required by Auth.js) and is
// tied to the current PIN, so changing ADMIN_PIN logs every device out.
//
// With no ADMIN_PIN set, paid features are open during local development
// (`npm run dev`) and closed in production, so a deploy that forgets the PIN
// fails safe instead of handing out your credits.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'wg_admin';
const MAX_AGE_SECS = 60 * 60 * 24 * 30; // 30 days

// Wrong-PIN lockout. Kept in memory, so on Vercel each server instance counts
// separately and a cold start resets it. It still turns "guess all 10,000 PINs
// in a minute" into days of work. Use a PIN longer than 4 digits anyway.
const MAX_FAILURES = 5;
const LOCKOUT_MS   = 15 * 60 * 1000;
const failures     = new Map(); // ip → { count, until }

function pin() {
  return (process.env.ADMIN_PIN ?? '').trim();
}

export function pinConfigured() {
  return pin().length > 0;
}

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
}

function sign(expires) {
  const pinTag = createHash('sha256').update(pin()).digest('hex').slice(0, 16);
  return createHmac('sha256', secret()).update(`${expires}.${pinTag}`).digest('base64url');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isAdmin(request) {
  if (!pinConfigured()) return process.env.NODE_ENV !== 'production';
  if (!secret()) return false;
  const [expires, sig] = readCookie(request, ADMIN_COOKIE).split('.');
  if (!expires || !sig || !(Number(expires) > Date.now())) return false;
  return safeEqual(sig, sign(expires));
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
}

// Returns { ok } on success, or { ok: false, status, error }.
export function checkPin(request, attempt) {
  const ip  = clientIp(request);
  const now = Date.now();
  const rec = failures.get(ip);
  if (rec && rec.until > now) {
    const mins = Math.ceil((rec.until - now) / 60000);
    return { ok: false, status: 429, error: `Too many wrong PINs. Try again in ${mins} min.` };
  }
  if (!secret()) {
    return { ok: false, status: 500, error: 'AUTH_SECRET is not set on the server.' };
  }

  // Hash both sides so the comparison is constant-time even when lengths differ.
  const given  = createHash('sha256').update(String(attempt ?? '').trim()).digest();
  const actual = createHash('sha256').update(pin()).digest();
  if (timingSafeEqual(given, actual)) {
    failures.delete(ip);
    return { ok: true };
  }

  // A lockout that has expired starts the count over.
  const count = (rec && !rec.until ? rec.count : 0) + 1;
  if (failures.size > 5000) failures.clear(); // keep memory bounded
  failures.set(ip, { count, until: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0 });
  return { ok: false, status: 401, error: 'Incorrect PIN.' };
}

// Secure (HTTPS-only) whenever the request came in over HTTPS, as it always
// does on Vercel. Plain-HTTP testing over the LAN still works.
function isHttps(request) {
  const proto = request?.headers.get('x-forwarded-proto') ?? '';
  return proto.split(',')[0].trim() === 'https' || request?.url?.startsWith('https:');
}

function cookieAttrs(request, maxAge) {
  const secure = isHttps(request) ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function adminCookie(request) {
  const expires = Date.now() + MAX_AGE_SECS * 1000;
  return `${ADMIN_COOKIE}=${expires}.${sign(expires)}; ${cookieAttrs(request, MAX_AGE_SECS)}`;
}

export function clearAdminCookie(request) {
  return `${ADMIN_COOKIE}=; ${cookieAttrs(request, 0)}`;
}

export function adminRequired() {
  return Response.json(
    { error: 'That voice is locked. Unlock it with the admin PIN in Settings.', locked: true },
    { status: 403 }
  );
}
