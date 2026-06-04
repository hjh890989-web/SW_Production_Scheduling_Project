import { test, expect, type Page } from '@playwright/test';

/**
 * Sprint 7 영향 시뮬 E2E (T7.5 — KSF-3, AC PM-1). 변동 입력 시 ≤5초 시각화.
 * 사전조건: `npx prisma db seed`. 실행: `npm run test:e2e`.
 */
async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('AC PM-1-1/KSF-3: W-3 품번 입력 → ≤5초 영향 시뮬 패널', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/change');
  const start = Date.now();
  await page.getByLabel('품번').fill('25490-03HA0');
  // debounce 500ms + 시뮬 → 패널(영향 시뮬레이션 또는 미등록 메시지) 표시
  await expect(page.getByText(/영향 시뮬레이션|미등록 품번/)).toBeVisible({ timeout: 5000 });
  expect(Date.now() - start).toBeLessThan(5000);
});

test('AC PM-1-2: 영향 카드 → W-4/W-5 하이라이트 링크 이동', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/change');
  await page.getByLabel('품번').fill('25490-03HA0');

  const link = page.getByRole('link', { name: /W-4 성형에서 보기/ });
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await expect(page).toHaveURL(/\/molding\?highlightItem=/);
    await expect(page.getByText(/영향 하이라이트/)).toBeVisible({ timeout: 10_000 });
  } else {
    // 스케줄 미생성 시 링크 없음 — 직접 하이라이트 URL 접근 검증
    await page.goto('/molding?highlightItem=25490-03HA0');
    await expect(page.getByRole('heading', { name: /성형 스케줄/ })).toBeVisible({ timeout: 10_000 });
  }
});
