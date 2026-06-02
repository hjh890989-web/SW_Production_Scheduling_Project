import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';

/**
 * Sprint 3 통합 E2E (T3.9 — 수주 통합 흐름).
 * 사전조건: `npx prisma db seed`(6 사용자 + 47품번) + 실 Raw Materials 엑셀.
 * 실행: `npm run test:e2e` (먼저 `npx playwright install chromium`).
 */
const prisma = new PrismaClient();

const WEEKLY_FILE = path.resolve('Raw Materials/Order/실리콘 02월 1주차 주간 계획.xlsx');

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
}

test('시나리오 1: 정수진 로그인 → W-2 업로드 → 적재 결과 표시 (AC SP-1-1)', async ({ page }) => {
  await login(page, 'jungsj', 'Test1234!');
  await page.goto('/orders/upload');
  await page.locator('input[type=file]').setInputFiles(WEEKLY_FILE);
  await page.getByRole('button', { name: /업로드 및 적재/ }).click();
  await expect(page.getByText(/적재 완료/)).toBeVisible({ timeout: 15_000 });
});

test('시나리오 2 (DB 검증): 업로드 후 Order 적재 + sourceType 분포 (AC T3.9-2)', async ({ page }) => {
  const before = await prisma.order.count();
  await login(page, 'jungsj', 'Test1234!');
  await page.goto('/orders/upload');
  await page.locator('input[type=file]').setInputFiles(WEEKLY_FILE);
  await page.getByRole('button', { name: /업로드 및 적재/ }).click();
  await expect(page.getByText(/적재 완료/)).toBeVisible({ timeout: 15_000 });

  const after = await prisma.order.count();
  expect(after).toBeGreaterThan(before);
  const weekly = await prisma.order.count({ where: { sourceType: 'weekly_plan' } });
  expect(weekly).toBeGreaterThan(0);
});

test('시나리오 3: 변동 입력 → 5초 grace 취소 노출 (AC SP-2-F2)', async ({ page }) => {
  await login(page, 'kimms', 'Test1234!');
  await page.goto('/orders/change');
  await page.getByLabel('품번').fill('25490-03HA0');
  await page.getByLabel(/신규 값/).fill('500');
  await page.getByLabel('사유').fill('E2E 테스트 변동');
  await page.getByRole('button', { name: '변동 저장' }).click();
  // 저장 성공 시 5초 카운트다운 취소 버튼 노출
  await expect(page.getByRole('button', { name: /취소 \(\d초\)/ })).toBeVisible({ timeout: 10_000 });
});
