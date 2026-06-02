import { describe, it, expect } from 'vitest';
import { decideKsfFetch, canRegisterServiceWorker } from './strategy';

describe('decideKsfFetch (T12.5.1, AC EX-1-F1)', () => {
  it('온라인 → 네트워크, 배너 없음', () => {
    expect(decideKsfFetch('online', true)).toEqual({ source: 'network', showOfflineBanner: false });
  });

  it('오프라인 + 캐시 → 캐시 + 배너', () => {
    expect(decideKsfFetch('offline', true)).toEqual({ source: 'cache', showOfflineBanner: true });
  });

  it('오프라인 + 캐시 없음 → 네트워크 시도 + 배너', () => {
    expect(decideKsfFetch('offline', false)).toEqual({ source: 'network', showOfflineBanner: true });
  });
});

describe('canRegisterServiceWorker (T12.5.1)', () => {
  it('serviceWorker 지원 여부 판정', () => {
    expect(canRegisterServiceWorker({ serviceWorker: {} })).toBe(true);
    expect(canRegisterServiceWorker({})).toBe(false);
    expect(canRegisterServiceWorker(undefined)).toBe(false);
  });
});
