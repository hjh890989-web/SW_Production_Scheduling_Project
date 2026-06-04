import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Sprint 1 통합 E2E (T1.8 — T1.1~T1.7 합동 검증).
 * 사전조건: `npx prisma db seed` 완료 + 앱 기동(webServer 자동).
 * 실행: `npm run test:e2e` (먼저 `npx playwright install chromium`).
 */

const prisma = new PrismaClient();

// 잠금 테스트 전용 사용자(다른 시드 계정 오염 방지)
const LOCK_USER = { username: 'leeyh', password: 'Test1234!' };

test.afterAll(async () => {
  // 잠금 테스트로 남은 상태 정리 (AC: 변경 시 cleanup)
  await prisma.user
    .updateMany({ where: { username: LOCK_USER.username }, data: { failedLogins: 0, lockedUntil: null } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

async function login(page: import('@playwright/test').Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

test('AC T1.3-1: 미인증 접근 → /login redirect (callbackUrl 보존)', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test('AC T1.4-1: 로그인 성공 → 대시보드(/) redirect', async ({ page }) => {
  await login(page, 'admin', 'admin1234!');
  await expect(page).toHaveURL('http://localhost:3000/');
});

test('AC T1.1-F1: 로그인 실패 → 에러 + LOGIN_FAILED audit 증가', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'LOGIN_FAILED' } });
  await login(page, 'kimms', 'wrong-password!');
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('올바르지 않습니다');
  const after = await prisma.auditLog.count({ where: { action: 'LOGIN_FAILED' } });
  expect(after).toBeGreaterThan(before);
});

test('AC T1.4-F1/T1.5: 5회 실패 → 계정 잠금', async ({ page }) => {
  await prisma.user.updateMany({
    where: { username: LOCK_USER.username },
    data: { failedLogins: 0, lockedUntil: null },
  });
  for (let i = 0; i < 5; i += 1) {
    await login(page, LOCK_USER.username, 'definitely-wrong!');
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
  }
  const user = await prisma.user.findUnique({ where: { username: LOCK_USER.username } });
  expect(user?.lockedUntil).not.toBeNull();
  expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
});

test('AC T1.3-F1/MR-1-F1: 권한 없음 → 403 + UNAUTHORIZED_ACCESS audit', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'UNAUTHORIZED_ACCESS' } });
  // 박철수(MOLDING_LEADER)는 order:read 권한 없음(extrusion:read는 보유 — 교차 조회 허용, lib/permissions.ts)
  await login(page, 'parkcs', 'Test1234!');
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/forbidden/);
  await expect(page.getByText('403')).toBeVisible();
  const after = await prisma.auditLog.count({ where: { action: 'UNAUTHORIZED_ACCESS' } });
  expect(after).toBeGreaterThan(before);
});

test('AC T1.8-2: LOGIN audit 기록 확인', async ({ page }) => {
  const before = await prisma.auditLog.count({ where: { action: 'LOGIN' } });
  await login(page, 'admin', 'admin1234!');
  await expect(page).toHaveURL('http://localhost:3000/');
  const after = await prisma.auditLog.count({ where: { action: 'LOGIN' } });
  expect(after).toBeGreaterThan(before);
});
