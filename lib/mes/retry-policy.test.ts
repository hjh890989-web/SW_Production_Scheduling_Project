import { describe, it, expect } from 'vitest';
import {
  shouldRetry,
  nextRetryAt,
  isDue,
  instructionSchema,
  RETRY_BASE_MS,
  MAX_ATTEMPTS,
} from './retry-policy';

describe('재시도 정책 (T9.4, AC T9.4-F1)', () => {
  it('한도 미만이면 재시도, 도달하면 중단', () => {
    expect(shouldRetry(0)).toBe(true);
    expect(shouldRetry(MAX_ATTEMPTS - 1)).toBe(true);
    expect(shouldRetry(MAX_ATTEMPTS)).toBe(false);
  });

  it('다음 재시도는 5분 후', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    expect(nextRetryAt(now).getTime() - now.getTime()).toBe(RETRY_BASE_MS);
  });

  it('isDue: nextRetry ≤ now', () => {
    const now = new Date('2026-06-01T00:05:00.000Z');
    expect(isDue(new Date('2026-06-01T00:00:00.000Z'), now)).toBe(true);
    expect(isDue(new Date('2026-06-01T00:10:00.000Z'), now)).toBe(false);
  });
});

describe('instructionSchema (T9.4)', () => {
  const ok = {
    instructionId: 'WI-1',
    weekStart: '2026-06-01',
    process: 'EXTRUSION',
    lines: [{ equipmentCode: 'EX-1', productCode: 'P1', quantity: 100 }],
  };

  it('정상 payload 통과', () => {
    expect(instructionSchema.safeParse(ok).success).toBe(true);
  });

  it('잘못된 weekStart·process 거부', () => {
    expect(instructionSchema.safeParse({ ...ok, weekStart: '2026/06/01' }).success).toBe(false);
    expect(instructionSchema.safeParse({ ...ok, process: 'CUTTING' }).success).toBe(false);
  });

  it('SEC: 달력상 무효 일자·과대 배치·overflow 거부', () => {
    expect(instructionSchema.safeParse({ ...ok, weekStart: '2026-13-40' }).success).toBe(false);
    expect(instructionSchema.safeParse({ ...ok, weekStart: '2026-02-30' }).success).toBe(false);
    expect(instructionSchema.safeParse({ ...ok, lines: Array(1001).fill(ok.lines[0]) }).success).toBe(false);
    expect(instructionSchema.safeParse({ ...ok, lines: [{ equipmentCode: 'E', productCode: 'P', quantity: 2_147_483_648 }] }).success).toBe(false);
  });
});
