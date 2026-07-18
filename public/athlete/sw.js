/* RISE service worker — precache app shell, runtime-cache the rest. */
const VERSION = 'rise-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/ui.js',
  'js/engine.js',
  'js/data.js',
  'js/sleep.js',
  'js/scenes.js',
  'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for shell (so updates land), cache-first for fonts/assets.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.origin === location.origin && url.pathname.startsWith('/athlete')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html')))
    );
    return;
  }

  // Fonts and other cross-origin assets: cache-first
  e.respondWith(
    caches.match(e.request).then((m) => m || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => m))
  );
});
