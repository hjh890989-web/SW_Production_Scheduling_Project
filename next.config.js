const { securityHeaders } = require('./lib/security/headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // T11.3 전역 보안 헤더(CSP 등) — 정의는 lib/security/headers.js 단일 소스.
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders() }];
  },
  webpack: (config) => {
    // Workaround: Windows + path with spaces causes EISDIR on readlink for non-symlink files.
    // Disabling symlink resolution avoids the misbehavior in enhanced-resolve.
    config.resolve.symlinks = false;
    return config;
  },
};

module.exports = nextConfig;
