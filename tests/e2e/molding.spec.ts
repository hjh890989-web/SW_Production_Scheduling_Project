import { test, expect, type Page, type Locator } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 5 J-MR-2 통합 E2E (T5.11 — 성형 자동 생성 + 드래그 재배분).
 * 사전조건: `npx prisma db seed`(장비·품번·캘린더). 실행: `npm run test:e2e`.
 * 드래그 실측을 위해 MoldingSchedule 1셀을 직접 시드한다(수주 자동생성 의존 제거 — 격리).
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

/** 드래그 대상 AUTO 셀 1개를 시드(성형 장비·품번 첫 행). */
async function seedMoldingCell(): Promise<void> {
  const eq = await prisma.equipment.findFirst({
    where: { type: { in: ['MOLDING_LP', 'MOLDING_IC'] } },
    orderBy: { code: 'asc' },
  });
  const item = await prisma.item.findFirst({ orderBy: { productCode: 'asc' } });
  if (!eq || !item) throw new Error('시드(성형 장비·품번) 누락 — db seed 먼저');
  const slots = ((eq.capacity as { slots?: string[] } | null)?.slots ?? []) as string[];
  await prisma.moldingSchedule.create({
    data: {
      weekStart: WS_DATE,
      date: WS_DATE,
      daynight: 'DAY',
      equipmentId: eq.id,
      slotPosition: slots[0] ?? 'A',
      itemId: item.id,
      rotations: 5,
      status: 'AUTO',
      ruleViolation: false,
    },
  });
}

/**
 * native HTML5 drag-drop 시뮬레이션.
 * Playwright의 locator.dragTo()는 dataTransfer를 채우지 못해 onDrop(getData)이 빈 값이 된다.
 * → 공유 DataTransfer 핸들을 만들어 dragstart→dragover→drop으로 직접 dispatch한다.
 */
async function nativeDragDrop(page: Page, source: Locator, target: Locator): Promise<void> {
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer: dt });
  await target.dispatchEvent('dragover', { dataTransfer: dt });
  await target.dispatchEvent('drop', { dataTransfer: dt });
  await source.dispatchEvent('dragend', { dataTransfer: dt });
}

test.beforeEach(async () => {
  // 매 테스트 깨끗한 1셀 (이전 잔여·MANUAL 전환분 제거)
  await prisma.moldingSchedule.deleteMany({ where: { weekStart: WS_DATE } });
  await seedMoldingCell();
});

test.afterAll(async () => {
  await prisma.moldingSchedule.deleteMany({ where: { weekStart: WS_DATE } });
  await prisma.$disconnect();
});

test('성형 반장 박철수 → W-4 진입 + 자동 생성 버튼', async ({ page }) => {
  await login(page, '90000002', '0000');
  await page.goto('/molding');
  await expect(page.getByRole('heading', { name: /성형 스케줄/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
});

test('AC MR-3: 자동 스케줄 생성 → MOLDING_SCHEDULE_GENERATED audit', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_GENERATED' } });
  await login(page, '90000001', '0000'); // 생산관리(molding:write 보유)
  await page.goto('/molding');
  await page.getByRole('button', { name: /자동 스케줄 생성/ }).click();
  await expect(page.getByText(/자동 생성 완료/)).toBeVisible({ timeout: 15_000 });

  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_GENERATED' } }), { timeout: 10_000 })
    .toBeGreaterThan(before);
});

test('⭐ AC MR-2-1 (J-MR-2): 드래그 재배분 → MANUAL 전환 + MOLDING_SCHEDULE_MOVED audit', async ({ page }) => {
  const auditBefore = await prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_MOVED' } });
  await login(page, '90000001', '0000'); // molding:write
  await page.goto('/molding');

  // 시드한 AUTO 셀(draggable) — 같은 행의 다음 열(슬롯/일자)로 드래그
  const cell = page.locator('[draggable="true"]').first();
  await expect(cell).toBeVisible({ timeout: 10_000 });
  const cellTd = page.locator('td:has([draggable="true"])').first();
  const targetTd = cellTd.locator('xpath=following-sibling::td[1]');

  await nativeDragDrop(page, cell, targetTd);

  // 1) 성공 토스트(배치되었습니다) — 차단 없이 배치
  await expect(page.locator('p[role="alert"]')).toContainText(/배치/, { timeout: 10_000 });
  // 2) DB: 상태 AUTO → MANUAL
  await expect
    .poll(async () => prisma.moldingSchedule.count({ where: { weekStart: WS_DATE, status: 'MANUAL' } }), { timeout: 10_000 })
    .toBeGreaterThan(0);
  // 3) AuditLog: MOLDING_SCHEDULE_MOVED 기록
  await expect
    .poll(async () => prisma.auditLog.count({ where: { action: 'MOLDING_SCHEDULE_MOVED' } }), { timeout: 10_000 })
    .toBeGreaterThan(auditBefore);
});
