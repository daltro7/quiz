// Service Worker para QuizForge Métricas PWA
const CACHE_NAME = 'qf-metrics-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Para arquivos HTML, sempre busca da rede primeiro (network-first) para nunca travar atualizações
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Demais recursos: pass-through padrão
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
