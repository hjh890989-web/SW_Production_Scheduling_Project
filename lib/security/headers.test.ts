import { describe, it, expect } from 'vitest';
import { buildCsp, securityHeaders } from './headers';

describe('buildCsp (T11.3 + SEC nonce)', () => {
  const csp = buildCsp();

  it('self 기반 default-src + 클릭재킹 차단(frame-ancestors none)', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('외부 http(s) origin 미허용(사내망·자체호스팅)', () => {
    expect(csp).not.toMatch(/https?:\/\//);
  });

  it('nonce 없으면 script-src는 self만(unsafe-inline 없음)', () => {
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('SEC: nonce 주면 script-src에 nonce+strict-dynamic, unsafe-inline 없음', () => {
    const withNonce = buildCsp('abc123');
    expect(withNonce).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(withNonce).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});

describe('securityHeaders (T11.3)', () => {
  const headers = securityHeaders();
  const map = new Map(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

  it('정적 보안 헤더 포함(CSP는 미들웨어에서 동적 설정하므로 제외)', () => {
    expect(map.get('X-Frame-Options')).toBe('DENY');
    expect(map.get('X-Content-Type-Options')).toBe('nosniff');
    expect(map.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(map.get('Strict-Transport-Security')).toMatch(/max-age=\d+/);
    expect(map.get('Permissions-Policy')).toContain('geolocation=()');
    expect(map.has('Content-Security-Policy')).toBe(false);
  });
});
