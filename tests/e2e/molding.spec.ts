import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 5 J-MR-2 통합 E2E (T5.11 — 성형 자동 생성 + 드래그 재배분).
 * 사전조건: `npx prisma db seed`(장비·품번·캘린더) + 수주 업로드(있으면 셀 생성).
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
  await expect(page).not.toHaveURL(/\/login/);
}

test('성형 반장 박철수 → W-4 진입 + 자동 생성 버튼', async ({ page }) => {
  await login(page, 'parkcs', 'Test1234!');
  await page.goto('/molding');
  await expect(page.getByRole('heading', { name: /성형 스케줄/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
});

test('AC MR-3: 자동 스케줄 생성 → MOLDING_SCHEDULE_GENERATED audit', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_GENERATED' } });
  await login(page, 'kimms', 'Test1234!'); // 생산관리(molding:write 보유)
  await page.goto('/molding');
  await page.getByRole('button', { name: /자동 스케줄 생성/ }).click();
  await expect(page.getByText(/자동 생성 완료/)).toBeVisible({ timeout: 15_000 });

  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_GENERATED' } }), { timeout: 10_000 })
    .toBeGreaterThan(before);
});

test('AC MR-2-1: 셀이 있으면 드래그로 다른 슬롯 이동 → MANUAL 전환', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/molding');
  const cells = page.locator('[draggable="true"]');
  const count = await cells.count();
  test.skip(count < 1, '배치 셀 없음(수주 업로드 필요) — 드래그 시나리오 생략');

  // 첫 셀을 같은 행의 다른 열로 드래그(좌표 기반)
  const target = page.locator('td').nth(2);
  await cells.first().dragTo(target);
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
});
