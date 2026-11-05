// Service Worker para QuizForge Métricas PWA
const CACHE_NAME = 'qf-metrics-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through padrão para requisições de rede
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
