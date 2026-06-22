const cacheName = 'budgetbuddy-cache-v1';
const assetsToCache = [
  '/index.html',
  '/dashboard.html',
  '/reports.html',
  '/settings.html',
  '/wallet.html',
  '/goals.html',
  '/transactions.html',
  '/ai-assistant.html',
  '/style.css',
  '/Javascript.js',
  '/login.js',
  '/register.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(assetsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== cacheName)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
