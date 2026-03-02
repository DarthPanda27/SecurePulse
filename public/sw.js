const STATIC_CACHE = 'securepulse-static-v1';
const API_CACHE = 'securepulse-api-v1';
const STATIC_ASSETS = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];
const DAILY_BRIEF_ENDPOINT = '/api/daily-briefs/latest';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  if (requestUrl.pathname === DAILY_BRIEF_ENDPOINT) {
    event.respondWith(networkFirstDailyBrief(event.request));
    return;
  }

  const isStaticAsset =
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    requestUrl.pathname.startsWith('/icons/') ||
    requestUrl.pathname === '/manifest.webmanifest';

  if (isStaticAsset) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(navigationFallback(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirstDailyBrief(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({
        title: 'Offline brief unavailable',
        summary: 'Connect once to cache your latest daily brief for offline reading.',
        severity: 'info',
        confidence: 'n/a',
        bullets: [],
        action: 'Reconnect and refresh to sync the latest threat intelligence.',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}

async function navigationFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
    return caches.match('/offline.html');
  }
}
