// ═══════════════════════════════════════════
// Хатинград — Service Worker
// Кешує гру для офлайн-режиму
// Версія кешу — міняй при кожному великому оновленні
// ═══════════════════════════════════════════

const CACHE_NAME = 'khatynhrad-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@700;800;900&display=swap',
];

// ── Встановлення: кешуємо всі файли ──
self.addEventListener('install', event => {
  console.log('[SW] Встановлення Хатинград v1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Деякі файли не закешовано:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Активація: видаляємо старий кеш ──
self.addEventListener('activate', event => {
  console.log('[SW] Активація...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Видаляємо старий кеш:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Запити: спочатку кеш, потім мережа ──
self.addEventListener('fetch', event => {
  // Ігноруємо не-GET запити
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Є в кеші — повертаємо, але фоново оновлюємо
        fetch(event.request)
          .then(fresh => {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, fresh)
            );
          })
          .catch(() => {});
        return cached;
      }

      // Немає в кеші — завантажуємо з мережі
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, clone)
          );
          return response;
        })
        .catch(() => {
          // Офлайн і немає кешу — повертаємо головну сторінку
          return caches.match('./index.html');
        });
    })
  );
});

// ── Повідомлення від клієнта (примусове оновлення) ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
