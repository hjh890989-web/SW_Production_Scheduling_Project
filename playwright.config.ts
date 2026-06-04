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
  // 공유 SQLite DB(감사 카운트·잠금)를 변경하므로 직렬 실행 유지. CI 일시 flake는 재시도로 흡수.
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI는 프로덕션 빌드(next start)를 대상으로 — dev의 라우트별 온디맨드 컴파일 지연(flake) 회피.
    // 로컬은 dev로 빠른 반복. CI에서는 사전 `npm run build` 후 이 명령이 .next를 사용한다.
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
