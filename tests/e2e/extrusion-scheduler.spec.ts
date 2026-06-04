import { test, expect, type Page, type Locator } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 6 E2E (T6.7 — 압출 자동 스케줄 + 드래그 재배분 + 확정).
 * 사전조건: `npx prisma db seed`(압출기·품번·캘린더). 실행: `npm run test:e2e`.
 * 실측을 위해 ExtrusionSchedule 1셀을 직접 시드한다(성형→관체→압출 선행 의존 제거 — 격리).
 */
const prisma = new PrismaClient();

const WEEK_START = '2026-05-18';
const WS_DATE = new Date(`${WEEK_START}T00:00:00.000Z`);

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('사번').fill(username);
  await page.getByLabel('비밀번호 (4자리 PIN)').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** 드래그·확정 대상 AUTO 셀 1개 시드(압출기·품번 첫 행). */
async function seedExtrusionCell(): Promise<void> {
  const eq = await prisma.equipment.findFirst({ where: { type: 'EXTRUSION' }, orderBy: { code: 'asc' } });
  const item = await prisma.item.findFirst({ orderBy: { productCode: 'asc' } });
  if (!eq || !item) throw new Error('시드(압출기·품번) 누락 — db seed 먼저');
  await prisma.extrusionSchedule.create({
    data: {
      weekStart: WS_DATE,
      date: WS_DATE,
      shift: 'DAY_FIRST',
      extruderId: eq.id,
      itemId: item.id,
      quantity: 100,
      extrusionGroup: 1,
      headPin: 'P1',
      status: 'AUTO',
      ruleViolation: false,
    },
  });
}

/** native HTML5 drag-drop 시뮬(Playwright dragTo는 dataTransfer 미지원 → 공유 DataTransfer dispatch). */
async function nativeDragDrop(page: Page, source: Locator, target: Locator): Promise<void> {
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer: dt });
  await target.dispatchEvent('dragover', { dataTransfer: dt });
  await target.dispatchEvent('drop', { dataTransfer: dt });
  await source.dispatchEvent('dragend', { dataTransfer: dt });
}

test.beforeEach(async () => {
  await prisma.extrusionSchedule.deleteMany({ where: { weekStart: WS_DATE } });
  await seedExtrusionCell();
});

test.afterAll(async () => {
  await prisma.extrusionSchedule.deleteMany({ where: { weekStart: WS_DATE } });
  await prisma.$disconnect();
});

test('압출 반장 이영호 → W-5 진입 + 자동 생성/확정 버튼', async ({ page }) => {
  await login(page, '90000003', '0000');
  await page.goto('/extrusion');
  await expect(page.getByRole('heading', { name: /압출 스케줄/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '확정' })).toBeVisible();
});

test('AC ER-1: 자동 생성 → EXTRUSION_SCHEDULE_GENERATED audit + 다이/노즐 카드', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_GENERATED' } });
  await login(page, '90000001', '0000'); // 생산관리(extrusion:write 보유)
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

test('⭐ AC ER-2-1 (드래그 재배분): 압출 셀 드래그 → MANUAL + EXTRUSION_SCHEDULE_MOVED audit', async ({ page }) => {
  const auditBefore = await prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_MOVED' } });
  await login(page, '90000001', '0000'); // extrusion:write
  await page.goto('/extrusion');

  const cell = page.locator('[draggable="true"]').first();
  await expect(cell).toBeVisible({ timeout: 10_000 });
  const cellTd = page.locator('td:has([draggable="true"])').first();
  const targetTd = cellTd.locator('xpath=following-sibling::td[1]');

  await nativeDragDrop(page, cell, targetTd);

  await expect(page.locator('p[role="alert"]')).toContainText(/배치/, { timeout: 10_000 });
  await expect
    .poll(async () => prisma.extrusionSchedule.count({ where: { weekStart: WS_DATE, status: 'MANUAL' } }), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_MOVED' } }), { timeout: 10_000 })
    .toBeGreaterThan(auditBefore);
});

test('⭐ AC ER-2-3 (확정): 확정 → CONFIRMED + EXTRUSION_SCHEDULE_CONFIRMED audit', async ({ page }) => {
  const auditBefore = await prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_CONFIRMED' } });
  await login(page, '90000001', '0000'); // extrusion:confirm 보유
  await page.goto('/extrusion');

  await page.getByRole('button', { name: '확정' }).click();

  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'EXTRUSION_SCHEDULE_CONFIRMED' } }), { timeout: 10_000 })
    .toBeGreaterThan(auditBefore);
  await expect
    .poll(async () => prisma.extrusionSchedule.count({ where: { weekStart: WS_DATE, status: 'CONFIRMED' } }), { timeout: 10_000 })
    .toBeGreaterThan(0);
});
