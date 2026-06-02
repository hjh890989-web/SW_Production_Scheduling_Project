import { describe, it, expect } from 'vitest';
import { buildCsp, securityHeaders } from './headers';

describe('buildCsp (T11.3)', () => {
  const csp = buildCsp();

  it('self 기반 default-src + 클릭재킹 차단(frame-ancestors none)', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('외부 http(s) origin 미허용(사내망·자체호스팅)', () => {
    expect(csp).not.toMatch(/https?:\/\//);
  });
});

describe('securityHeaders (T11.3)', () => {
  const headers = securityHeaders();
  const map = new Map(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

  it('핵심 보안 헤더 6종 포함', () => {
    expect(map.get('X-Frame-Options')).toBe('DENY');
    expect(map.get('X-Content-Type-Options')).toBe('nosniff');
    expect(map.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(map.get('Strict-Transport-Security')).toMatch(/max-age=\d+/);
    expect(map.get('Permissions-Policy')).toContain('geolocation=()');
    expect(map.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});
