/**
 * T12.5.1 PWA 캐시/오프라인 판정 — 순수 함수. SW의 stale-while-revalidate 정책을 앱 레벨에서 표현.
 */

export type NetState = 'online' | 'offline';

export interface FetchDecision {
  source: 'network' | 'cache';
  /** 오프라인이면 배너 표시(AC EX-1-F1). */
  showOfflineBanner: boolean;
}

/** 온라인이면 네트워크, 오프라인이면 캐시(있을 때) + 오프라인 배너. */
export function decideKsfFetch(net: NetState, hasCache: boolean): FetchDecision {
  if (net === 'online') return { source: 'network', showOfflineBanner: false };
  return { source: hasCache ? 'cache' : 'network', showOfflineBanner: true };
}

/** SW 등록 가능 환경인지(브라우저 + serviceWorker 지원). */
export function canRegisterServiceWorker(nav: { serviceWorker?: unknown } | undefined): boolean {
  return typeof nav === 'object' && nav !== null && 'serviceWorker' in nav && nav.serviceWorker != null;
}
