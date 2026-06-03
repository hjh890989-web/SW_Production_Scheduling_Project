/* eslint-disable */
// T12.5.1 EVS Service Worker (SEC 하드닝 — 교차 사용자 데이터 유출 방지).
// 정책: **정적 자산만** 캐시. HTML 내비게이션은 network-first(+ /offline 폴백),
// 인증/사용자별 HTML·API 응답은 절대 캐시하지 않는다. 캐시 규칙은 lib/pwa/cacheable.ts와 동일.
const CACHE = 'evs-static-v2';
const OFFLINE_URL = '/offline';

const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'worker']);
const STATIC_PREFIXES = ['/_next/static/', '/icons/'];
const STATIC_EXT = /\.(?:css|js|mjs|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico|map)$/i;

// lib/pwa/cacheable.ts:isCacheableAsset 와 동일 규칙(SW는 TS import 불가 → 인라인 미러).
function isCacheableAsset(pathname, destination) {
  if (pathname.startsWith('/api/')) return false;
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (STATIC_EXT.test(pathname)) return true;
  if (STATIC_DESTINATIONS.has(destination)) return true;
  return false;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // 세션 데이터 없는 정적 오프라인 페이지만 미리 캐시(인증 셸 캐시 금지).
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1) HTML 내비게이션: network-first, 실패 시에만 정적 /offline 폴백(인증 셸 캐시·재사용 안 함).
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // 2) 정적 자산만 stale-while-revalidate. 그 외(데이터·인증)는 캐시하지 않음.
  if (!isCacheableAsset(url.pathname, req.destination)) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            // 동일 오리진·비리다이렉트·200 정적 응답만 저장(오염/민감응답 방지).
            if (res && res.status === 200 && res.type === 'basic' && !res.redirected) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    ),
  );
});
