// Owner-only lock — separate from the admin lock that gates paid voices.
// Use this for anything that only Chris should ever touch: database views,
// usage stats, API key management, etc.
//
// Set OWNER_PIN in Vercel env vars (different from ADMIN_PIN).
// Without OWNER_PIN, owner access is always denied — even in dev.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const OWNER_COOKIE = 'wg_owner';
const MAX_AGE_SECS = 60 * 60 * 24 * 30; // 30 days

const MAX_FAILURES = 5;
const LOCKOUT_MS   = 15 * 60 * 1000;
const failures     = new Map();

function pin() {
  return (process.env.OWNER_PIN ?? '').trim();
}

export function pinConfigured() {
  return pin().length > 0;
}

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
}

// Include 'owner' in the HMAC input so this cookie can never be confused
// with the admin cookie even if someone knows AUTH_SECRET.
function sign(expires) {
  const pinTag = createHash('sha256').update(pin()).digest('hex').slice(0, 16);
  return createHmac('sha256', secret()).update(`${expires}.owner.${pinTag}`).digest('base64url');
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

export function isOwner(request) {
  if (!pinConfigured()) return false; // no PIN = no owner access, ever
  if (!secret()) return false;
  const [expires, sig] = readCookie(request, OWNER_COOKIE).split('.');
  if (!expires || !sig || !(Number(expires) > Date.now())) return false;
  return safeEqual(sig, sign(expires));
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
}

export function checkPin(request, attempt) {
  if (!pinConfigured()) {
    return { ok: false, status: 500, error: 'OWNER_PIN is not set on the server.' };
  }
  if (!secret()) {
    return { ok: false, status: 500, error: 'AUTH_SECRET is not set on the server.' };
  }

  const ip  = clientIp(request);
  const now = Date.now();
  const rec = failures.get(ip);
  if (rec && rec.until > now) {
    const mins = Math.ceil((rec.until - now) / 60000);
    return { ok: false, status: 429, error: `Too many wrong PINs. Try again in ${mins} min.` };
  }

  const given  = createHash('sha256').update(String(attempt ?? '').trim()).digest();
  const actual = createHash('sha256').update(pin()).digest();
  if (timingSafeEqual(given, actual)) {
    failures.delete(ip);
    return { ok: true };
  }

  const count = (rec && !rec.until ? rec.count : 0) + 1;
  if (failures.size > 5000) failures.clear();
  failures.set(ip, { count, until: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0 });
  return { ok: false, status: 401, error: 'Incorrect PIN.' };
}

function isHttps(request) {
  const proto = request?.headers.get('x-forwarded-proto') ?? '';
  return proto.split(',')[0].trim() === 'https' || request?.url?.startsWith('https:');
}

function cookieAttrs(request, maxAge) {
  const secure = isHttps(request) ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function ownerCookie(request) {
  const expires = Date.now() + MAX_AGE_SECS * 1000;
  return `${OWNER_COOKIE}=${expires}.${sign(expires)}; ${cookieAttrs(request, MAX_AGE_SECS)}`;
}

export function clearOwnerCookie(request) {
  return `${OWNER_COOKIE}=; ${cookieAttrs(request, 0)}`;
}
