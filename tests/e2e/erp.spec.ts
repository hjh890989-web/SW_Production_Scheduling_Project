import { test, expect, request } from '@playwright/test';

/**
 * Sprint 10 ERP 연동 E2E (T10.4). 동기화 API 인증 계약 검증. 실행: `npm run test:e2e`.
 * 실 영림원 미확정(TBD-2)이므로 인증·응답 계약만 확인한다.
 */
test('AC T10.2-F1: ERP_API_KEY 없으면 401', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/erp/sync', { data: {} });
  expect(res.status()).toBe(401);
});

test('AC T10.2-1: 인증 통과 시 동기화 응답(200 또는 503)', async ({ baseURL }) => {
  const key = process.env.ERP_API_KEY;
  test.skip(!key, 'ERP_API_KEY 미설정 — 인증 통과 검증 생략');
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/erp/sync', { headers: { 'x-erp-api-key': key! }, data: {} });
  expect([200, 503]).toContain(res.status());
});
