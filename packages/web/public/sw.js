const CACHE_NAME = 'jus-breathe-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './timerWorker.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Jus Breathe: Caching static assets');
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Jus Breathe: Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache successful requests for our app scripts and styling
          if (
            e.request.url.startsWith(self.location.origin) && 
            networkResponse.status === 200 &&
            (e.request.url.includes('/assets/') || e.request.url.includes('/src/'))
          ) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
