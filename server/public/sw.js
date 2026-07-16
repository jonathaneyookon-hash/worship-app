// Minimal service worker — just enough app-shell caching to satisfy browser
// "installable PWA" requirements. Search/schedule data always goes over the
// network (this app is only useful when connected to the desktop anyway),
// so this deliberately doesn't try to cache API responses.

const CACHE_NAME = 'scripture-remote-shell-v1';
const SHELL_FILES = ['/', '/remote.css', '/remote.js', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // App shell: cache-first. Everything else (API calls): network-only.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
