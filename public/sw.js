// public/sw.js - Portfolio Showcase Service Worker

const CACHE_NAME = 'billing-showcase-v1';
const ASSETS = [
  '/',
  '/login.html',
  '/index.html',
  '/history.html',
  '/activity.html',
  '/auth-session.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
