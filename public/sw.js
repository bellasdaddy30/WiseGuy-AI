// WiseGuy AI service worker
//
// FIX: the old version answered every request from the cache first and only
// refreshed the cache in the background. That meant every deploy stayed
// invisible until the SECOND time the app was opened, and on an installed
// iPhone app that can take days. Pages now go to the network first, so a new
// deploy shows up on the very next load. The cache is only a fallback for
// when the phone is offline.
//
// Bump this name whenever this file changes. Activating deletes every cache
// that does not match it, which throws away anything the old worker stored.
const CACHE = 'wiseguy-v3';

// Shell pages saved up front so the app still opens with no signal
// Only pages anyone can open. The rest need sign-in, so caching them before
// sign-in would store the sign-in page under their names.
const PRECACHE = ['/', '/paid', '/account', '/privacy', '/terms'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Next.js puts a content hash in every filename under /_next/static/, so a
// given URL never changes. Safe to serve from cache forever.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

// Pages and everything else: always ask the server, keep a copy for offline.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept API calls, auth, or external requests — let them go straight to network
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(cacheFirst(request));
    return;
  }

  e.respondWith(networkFirst(request));
});
