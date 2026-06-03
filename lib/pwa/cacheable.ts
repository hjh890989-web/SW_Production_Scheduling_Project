/**
 * T12.5.1 보안 하드닝(SEC) — SW 캐시 대상 판정(순수). 인증·사용자별 응답이 캐시되어
 * 공유/키오스크 기기에서 다른 세션에 노출되는 사고를 막기 위해, **정적 자산만** 캐시한다.
 * HTML 내비게이션·API·자격증명 응답은 절대 캐시하지 않는다(network-first + /offline 폴백).
 */

const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'worker']);
const STATIC_PREFIXES = ['/_next/static/', '/icons/'];
const STATIC_EXT = /\.(?:css|js|mjs|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico|map)$/i;

/**
 * 같은 오리진 GET 요청이 캐시 가능한 정적 자산인지. document/navigate·/api·/login 은 false.
 * @param pathname URL.pathname
 * @param destination Request.destination ('document'|'script'|'style'|'image'|'font'|''|...)
 */
export function isCacheableAsset(pathname: string, destination: string): boolean {
  if (pathname.startsWith('/api/')) return false; // 데이터·인증 응답 캐시 금지
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true; // Next 정적 청크 등
  if (STATIC_EXT.test(pathname)) return true; // 정적 확장자
  if (STATIC_DESTINATIONS.has(destination)) return true; // 브라우저가 정적 자원으로 요청
  return false; // HTML 내비게이션·정체불명 → 캐시하지 않음(사용자별 데이터 유출 방지)
}
