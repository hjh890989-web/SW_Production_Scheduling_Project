import { defineConfig, devices } from '@playwright/test';

/**
 * Sprint 1 E2E (T1.8 — 인증·권한·Audit 흐름).
 * 실행 전 준비: `npx playwright install chromium` + `npx prisma db seed`.
 * 전체 E2E ≤ 5분(CI 제약), 각 테스트 ≤ 5초 응답(AC T1.8-F1).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
