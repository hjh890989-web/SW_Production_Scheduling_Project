import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 6 E2E (T6.7 — 압출 자동 스케줄 + 다이/노즐 카운트 + 수동 조정).
 * 사전조건: `npx prisma db seed` + 성형 스케줄 생성(셀이 있어야 관체→압출 생성).
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

test('압출 반장 이영호 → W-5 진입 + 자동 생성/확정 버튼', async ({ page }) => {
  await login(page, 'leeyh', 'Test1234!');
  await page.goto('/extrusion');
  await expect(page.getByRole('heading', { name: /압출 스케줄/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '확정' })).toBeVisible();
});

test('AC ER-1: 자동 생성 → EXTRUSION_SCHEDULE_GENERATED audit + 다이/노즐 카드', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_GENERATED' } });
  await login(page, 'kimms', 'Test1234!'); // 생산관리(extrusion:write 보유)
  await page.goto('/extrusion');
  await page.getByRole('button', { name: /자동 스케줄 생성/ }).click();
  await expect(page.getByText(/자동 생성 완료/)).toBeVisible({ timeout: 15_000 });

  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_GENERATED' } }), { timeout: 10_000 })
    .toBeGreaterThan(before);

  // KSF-2 다이/노즐 카드(셀이 있을 때)
  const hasCells = (await prisma.extrusionSchedule.count()) > 0;
  if (hasCells) await expect(page.getByText(/다이\/노즐 변경/)).toBeVisible();
});

test('AC ER-2-3: 확정 → CONFIRMED audit', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/extrusion');
  const cells = await prisma.extrusionSchedule.count();
  test.skip(cells < 1, '압출 셀 없음(성형 스케줄 선행 필요) — 확정 시나리오 생략');

  const before = await prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_CONFIRMED' } });
  await page.getByRole('button', { name: '확정' }).click();
  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_CONFIRMED' } }), { timeout: 10_000 })
    .toBeGreaterThan(before);
});
