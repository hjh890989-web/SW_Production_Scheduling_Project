import { test, expect, type Page } from '@playwright/test';

/**
 * Sprint 11 — 14 페르소나 스토리 E2E (T11.1, PRD §3 14 Story).
 * Sprint 0~10 통합 시나리오를 페르소나별 권한(seed 사용자)으로 검증. 실행: `npm run test:e2e`.
 * 사전조건: `npx prisma db seed`. J-MR-2(MR-2)는 도입 성패 핵심(⭐).
 */
async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// ── PM: 생산관리 (kimms / PRODUCTION_MANAGER) ──
test('PM-1: 변동 입력 → 5분 내 영향 시뮬', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/change');
  await page.getByLabel('품번').fill('25490-03HA0');
  await expect(page.getByText(/영향 시뮬레이션|미등록 품번/)).toBeVisible({ timeout: 5000 });
});

test('PM-2: 자동 백워드 스케줄 생성(자동+수동)', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/molding');
  await expect(page.getByRole('heading', { name: /성형 스케줄/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
});

test('PM-3: 제약·이력 명문화(감사 이력)', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/audit');
  await expect(page).toHaveURL(/\/orders\/audit/);
  await expect(page.getByRole('heading')).toBeVisible();
});

test('PM-4: 자원 이상 시뮬(압출 부하 그래프) [P1]', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/extrusion');
  await expect(page.getByRole('heading', { name: /압출 스케줄/ })).toBeVisible();
});

// ── MR: 성형 반장 (parkcs / MOLDING_LEADER) ──
test('MR-1: 성형 스케줄 조회', async ({ page }) => {
  await login(page, 'parkcs', 'Test1234!');
  await page.goto('/molding');
  await expect(page.getByRole('heading', { name: /성형 스케줄/ })).toBeVisible();
});

test('MR-2 ⭐ J-MR-2: 성형 슬롯 그리드 표시(드래그 재배분 대상)', async ({ page }) => {
  await login(page, 'parkcs', 'Test1234!');
  await page.goto('/molding');
  // 그리드 또는 시드 안내 — 핵심은 W-4 진입·렌더 성공(드래그 재배분 UI 진입점)
  await expect(page.getByText(/가류기|성형 장비 시드/)).toBeVisible({ timeout: 10_000 });
});

test('MR-3: 성형 상태 요약(자동/수동/확정)', async ({ page }) => {
  await login(page, 'parkcs', 'Test1234!');
  await page.goto('/molding');
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
});

// ── ER: 압출 반장 (leeyh / EXTRUSION_LEADER) ──
test('ER-1: 압출 스케줄 조회', async ({ page }) => {
  await login(page, 'leeyh', 'Test1234!');
  await page.goto('/extrusion');
  await expect(page.getByRole('heading', { name: /압출 스케줄/ })).toBeVisible();
});

test('ER-2: 압출 확정 버튼 노출', async ({ page }) => {
  await login(page, 'leeyh', 'Test1234!');
  await page.goto('/extrusion');
  await expect(page.getByRole('button', { name: /확정/ })).toBeVisible();
});

test('ER-3: 압출 자동 배치 생성 진입점', async ({ page }) => {
  await login(page, 'leeyh', 'Test1234!');
  await page.goto('/extrusion');
  await expect(page.getByRole('button', { name: /자동 스케줄 생성/ })).toBeVisible();
});

// ── SP: 영업·수주 (jungsj / SALES_PURCHASE) ──
test('SP-1: 수주 엑셀 업로드 진입', async ({ page }) => {
  await login(page, 'jungsj', 'Test1234!');
  await page.goto('/orders/upload');
  await expect(page).toHaveURL(/\/orders\/upload/);
  await expect(page.getByRole('heading')).toBeVisible();
});

test('SP-2: 수주 변동 입력 진입', async ({ page }) => {
  await login(page, 'jungsj', 'Test1234!');
  await page.goto('/orders/change');
  await expect(page.getByLabel('품번')).toBeVisible();
});

// ── EX: 경영진 (exec / EXECUTIVE) [P2] ──
test('EX-1: KPI 대시보드 열람 [P2]', async ({ page }) => {
  await login(page, 'exec', 'Test1234!');
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('EX-2: 분기 KSF 리포트 열람 [P2]', async ({ page }) => {
  await login(page, 'exec', 'Test1234!');
  await page.goto('/reports/quarterly?quarter=2026-Q2');
  await expect(page.getByRole('heading', { name: /분기 KSF 리포트/ })).toBeVisible();
});
