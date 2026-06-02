/**
 * T11.3 보안 응답 헤더 (CSP 등). next.config.js(런타임 적용)와 vitest(검증)가 같은 소스를 쓰도록
 * CommonJS 단일 모듈로 둔다(드리프트 방지). 자체호스팅·사내망 전제 — 외부 origin 불허.
 *
 * @typedef {{ key: string, value: string }} HeaderKV
 */

/** CSP 지시어 문자열 생성. Next 런타임상 inline script/style 필요('unsafe-inline'). @returns {string} */
function buildCsp() {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

/** 전역 보안 헤더 목록. @returns {HeaderKV[]} */
function securityHeaders() {
  return [
    { key: 'Content-Security-Policy', value: buildCsp() },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}

module.exports = { buildCsp, securityHeaders };
