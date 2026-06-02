import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 4 통합 E2E (T4.6 — 대시보드·알림·audit 흐름).
 * 사전조건: `npx prisma db seed`(6 사용자 + 47품번) + 앱 기동(webServer).
 * 실행: `npm run test:e2e` (먼저 `npx playwright install chromium`).
 */
const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

test('대시보드 진입 + 헤더 알림 벨 노출', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /통합 대시보드/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /알림/ })).toBeVisible();
});

test('변동 입력 → ORDER_CHANGED audit 기록 (AC SP-2 흐름)', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'ORDER_CHANGED' } });
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/change');
  await page.getByLabel('품번').fill('25490-03HA0');
  await page.getByLabel(/신규 값/).fill('500');
  await page.getByLabel('사유').fill('Sprint4 E2E');
  await page.getByRole('button', { name: '변동 저장' }).click();
  await expect(page.getByRole('button', { name: /취소 \(\d초\)/ })).toBeVisible({ timeout: 10_000 });

  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'ORDER_CHANGED' } }), { timeout: 10_000 })
    .toBeGreaterThan(before);
});

test('감사 이력 화면에서 본인 기록 조회', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/audit');
  await expect(page.getByRole('heading', { name: /감사 이력/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV 다운로드' })).toBeVisible();
});

test('KSF 스냅샷 적재 후 대시보드 정상 표시', async ({ page }) => {
  // KSF 스냅샷을 직접 적재(수동 트리거 경로 대용) 후 대시보드 진입
  const day = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  await prisma.ksfDailySnapshot.upsert({
    where: { date: day },
    update: { ksf5Unification: 1 },
    create: { date: day, ksf5Unification: 1 },
  });
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/');
  await expect(page.getByText('KSF 6지표')).toBeVisible({ timeout: 10_000 });
});
