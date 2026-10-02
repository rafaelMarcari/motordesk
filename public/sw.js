// MotorDesk - Neutralized & Self-Unregistering Service Worker
// Eliminates API interception and cache hijacking across all browsers (Firefox, Chrome, Opera, Safari)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Pass 100% of all requests directly to the network.
// Never intercept API routes (/api/*), SSE streams, or documents.
self.addEventListener('fetch', () => {
  return;
});
