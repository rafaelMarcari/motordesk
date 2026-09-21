// MotorDesk - Service Worker Offline & Multi-Device Resiliency
const CACHE_NAME = 'motordesk-offline-v3';

const STATIC_PRECACHE = [];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Non-GET requests pass through directly
  if (req.method !== 'GET') {
    return;
  }

  // Always Network First to eliminate stale JS caches
  event.respondWith(
    fetch(req).catch(() => {
      return caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('/index.html') : null));
    })
  );
});
