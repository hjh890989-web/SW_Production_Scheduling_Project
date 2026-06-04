import { test, expect, type Page } from '@playwright/test';

/**
 * Sprint 12.5 PWA·모바일 E2E (T12.5.6). 모바일 뷰포트로 KSF·분기 리포트·매니페스트 확인.
 * 실행: `npm run test:e2e`. 사전조건: `npx prisma db seed`.
 */
test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 급

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('T12.5.2: 모바일 KSF 대시보드 진입', async ({ page }) => {
  await login(page, '90000005', '0000');
  await page.goto('/mobile');
  await expect(page.getByRole('heading', { name: /모바일 KSF/ })).toBeVisible();
});

test('T12.5.5: 모바일 분기 리포트 진입', async ({ page }) => {
  await login(page, '90000005', '0000');
  await page.goto('/mobile/report?quarter=2026-Q2');
  await expect(page.getByRole('heading', { name: /분기 리포트/ })).toBeVisible();
});

test('T12.5.1: PWA manifest 제공', async ({ page, baseURL }) => {
  const res = await page.request.get(`${baseURL}/manifest.webmanifest`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.display).toBe('standalone');
  expect(body.short_name).toBe('EVS');
});

test('T12.5.1: service worker 스크립트 제공', async ({ page, baseURL }) => {
  const res = await page.request.get(`${baseURL}/sw.js`);
  expect(res.ok()).toBeTruthy();
});
