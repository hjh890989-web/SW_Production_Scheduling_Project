import { test, expect, type Page } from '@playwright/test';

/**
 * Sprint 8 출력 E2E (T8.4 — F-6). 엑셀 다운로드 / 작업지시서 A4 인쇄 / 분기 리포트.
 * 사전조건: `npx prisma db seed`. 실행: `npm run test:e2e`.
 */
async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('AC T8.4-1: W-4 엑셀 다운로드 버튼 → 다운로드 또는 데이터 없음 안내', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/molding');
  const btn = page.getByRole('button', { name: '엑셀 다운로드' });
  await expect(btn).toBeVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await btn.click();
  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename()).toMatch(/스케줄_.*\.xlsx/);
  } else {
    // 데이터 0건 → 다운로드 없이 안내(AC T8.1-F1)
    await expect(page.getByText(/데이터 없음/)).toBeVisible();
  }
});

test('AC T8.4-1: 작업지시서 A4 인쇄 뷰 (큰 글씨 헤더)', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/work-instruction');
  await expect(page.getByRole('heading', { name: /작업지시서/ })).toBeVisible();
  // 인쇄/PDF 버튼 존재 (window.print 트리거)
  await expect(page.getByRole('button', { name: /인쇄 \/ PDF 저장/ })).toBeVisible();
});

test('AC T8.4-1: 분기 리포트 — 도입 전/후 비교표', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/reports/quarterly?quarter=2026-Q2');
  await expect(page.getByRole('heading', { name: /분기 KSF 리포트/ })).toBeVisible();
  await expect(page.getByText(/도입 전/)).toBeVisible();
  await expect(page.getByText(/도입 후/)).toBeVisible();
});
