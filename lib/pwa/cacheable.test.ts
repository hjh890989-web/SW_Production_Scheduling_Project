import { describe, it, expect } from 'vitest';
import { isCacheableAsset } from './cacheable';

describe('isCacheableAsset (SEC — SW 교차 사용자 유출 방지)', () => {
  it('정적 자산(destination)만 캐시', () => {
    expect(isCacheableAsset('/_next/static/chunks/main.js', 'script')).toBe(true);
    expect(isCacheableAsset('/styles.css', 'style')).toBe(true);
    expect(isCacheableAsset('/icon-192.png', 'image')).toBe(true);
    expect(isCacheableAsset('/font.woff2', 'font')).toBe(true);
  });

  it('정적 경로/확장자는 destination 무관 캐시(Next 청크 오프라인)', () => {
    expect(isCacheableAsset('/_next/static/abc.css', '')).toBe(true); // 정적 prefix → 허용
    expect(isCacheableAsset('/icons/x.svg', '')).toBe(true);
    expect(isCacheableAsset('/something.woff2', '')).toBe(true);
  });

  it('HTML 내비게이션은 캐시 금지(사용자별 데이터)', () => {
    expect(isCacheableAsset('/', 'document')).toBe(false);
    expect(isCacheableAsset('/orders/audit', 'document')).toBe(false);
    expect(isCacheableAsset('/mobile', 'document')).toBe(false);
  });

  it('API·인증 응답은 캐시 금지', () => {
    expect(isCacheableAsset('/api/health', 'document')).toBe(false);
    expect(isCacheableAsset('/api/metrics', '')).toBe(false);
    expect(isCacheableAsset('/api/mes/result', 'empty')).toBe(false);
  });

  it('정체불명(empty) 대상은 거부(보수적)', () => {
    expect(isCacheableAsset('/orders/change', 'empty')).toBe(false);
  });
});
