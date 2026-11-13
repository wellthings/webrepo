// Interagood Service Worker for PWA Offline & Asset Caching
const CACHE_NAME = 'interagood-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/partner-program.html',
  '/dashboard.html',
  '/admin.html',
  '/style.css',
  '/partner.css',
  '/shop.css',
  '/config.js',
  '/manifest.webmanifest',
  '/assets/favicon.png',
  '/assets/apple-touch-icon.png',
  '/assets/logo-square.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // API requests: strict network-first with offline JSON fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline mode: Network request unavailable' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  const reqPath = new URL(event.request.url).pathname;
  const isCodeOrDoc =
    event.request.mode === 'navigate' ||
    /\.(html|js|css|webmanifest)$/i.test(reqPath) ||
    reqPath === '/';

  // HTML / JS / CSS / Manifest: network-first so deployments update immediately, cache fallback when offline
  if (isCodeOrDoc) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, toCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
          });
        })
    );
    return;
  }

  // Static images/icons: cache-first with background refresh
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, toCache));
        return response;
      });
    })
  );
});
