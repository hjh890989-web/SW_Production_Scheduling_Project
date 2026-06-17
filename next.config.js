const { securityHeaders } = require('./lib/security/headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // T11.3 전역 보안 헤더(CSP 등) — 정의는 lib/security/headers.js 단일 소스.
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders() }];
  },
  // 수주 엑셀 업로드는 Server Action으로 전송됨. 기본 본문 한도 1MB는 다중(3종 동시)
  // 업로드 시 초과되어 413을 유발하므로, 파일당 50MB(MAX_UPLOAD_BYTES) × 3종을 수용하도록 상향.
  experimental: {
    serverActions: {
      bodySizeLimit: '160mb',
    },
  },
  // Next 16: Turbopack이 기본 빌드 엔진. (기존 webpack symlinks=false 워크어라운드는
  // 공백 포함 경로 전용이었고 현재 경로엔 공백이 없어 제거 — 공백 경로 환경에선 turbopack 설정으로 대응)
};

module.exports = nextConfig;
