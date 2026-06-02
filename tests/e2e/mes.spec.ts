import { test, expect, request } from '@playwright/test';

/**
 * Sprint 9 MES 연동 E2E (T9.6). 인증 경로 검증(정상·실패). 실행: `npm run test:e2e`.
 * 실 MES 미확정(TBD-3)이므로 수신 API의 인증·검증 계약만 확인한다.
 */
test('AC T9.2-F1: API key 없으면 401', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/mes/result', {
    data: { results: [{ externalId: 'e1', productCode: 'P1', process: 'MOLDING', quantity: 10, producedAt: '2026-06-01T00:00:00.000Z' }] },
  });
  expect(res.status()).toBe(401);
});

test('AC T9.2: 잘못된 본문은 422 (인증 통과 시)', async ({ baseURL }) => {
  const key = process.env.MES_API_KEY;
  test.skip(!key, 'MES_API_KEY 미설정 — 인증 통과 검증 생략');
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/mes/result', {
    headers: { 'x-mes-api-key': key! },
    data: { results: [] }, // 최소 1건 위반
  });
  expect(res.status()).toBe(422);
});
