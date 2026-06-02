/* eslint-disable */
// T12.5.1 EVS Service Worker — 신규 의존성 없이 수동 구현(Workbox 미사용).
// KSF 등 GET 요청에 stale-while-revalidate, 오프라인 시 캐시 폴백.
const CACHE = 'evs-cache-v1';
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_FALLBACK)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // stale-while-revalidate: 캐시 즉시 응답 + 백그라운드 갱신
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || cache.match(OFFLINE_FALLBACK));
        return cached || network;
      }),
    ),
  );
});
