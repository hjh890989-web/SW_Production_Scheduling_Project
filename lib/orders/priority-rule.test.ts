import { describe, it, expect } from 'vitest';
import { applyPriorityRule, type PriorityInput } from './priority-rule';
import type { SourceType } from './types';

function row(code: string, date: string, qty: number, src: SourceType): PriorityInput {
  return {
    itemId: code,
    rawProductCode: code,
    deliveryDate: date,
    quantity: qty,
    sourceType: src,
    confidence: 'CONFIRMED',
    orderType: src === 'kd' ? 'KD' : 'OEM',
  };
}
const active = (rs: ReturnType<typeof applyPriorityRule>) => rs.filter((r) => r.status === 'ACTIVE');

describe('applyPriorityRule (T3.5)', () => {
  it('AC T3.5-1: weekly_plan 우선, 나머지 superseded', () => {
    const res = applyPriorityRule([
      row('RH-A123', '2026-05-22', 700, 'weekly_plan'),
      row('RH-A123', '2026-05-22', 800, 'kd'),
      row('RH-A123', '2026-05-22', 600, 'monthly_forecast'),
    ]);
    const a = active(res);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ sourceType: 'weekly_plan', quantity: 700 });
  });

  it('AC T3.5-2: weekly 없으면 빠른 납기 채택', () => {
    const res = applyPriorityRule([
      row('P2', '2026-05-25', 600, 'monthly_forecast'),
      row('P2', '2026-05-22', 800, 'kd'),
    ]);
    const a = active(res);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ sourceType: 'kd', deliveryDate: '2026-05-22' });
  });

  it('AC T3.5-F1: 동일 일자 → weekly>kd>forecast deterministic', () => {
    const res = applyPriorityRule([
      row('P3', '2026-05-22', 10, 'monthly_forecast'),
      row('P3', '2026-05-22', 10, 'kd'),
    ]);
    expect(active(res)[0].sourceType).toBe('kd');
  });

  it('서로 다른 품번은 독립 처리', () => {
    const res = applyPriorityRule([
      row('A', '2026-05-22', 1, 'kd'),
      row('B', '2026-05-22', 1, 'monthly_forecast'),
    ]);
    expect(active(res)).toHaveLength(2);
  });

  it('weekly 다중 일자는 모두 ACTIVE 유지', () => {
    const res = applyPriorityRule([
      row('C', '2026-05-22', 1, 'weekly_plan'),
      row('C', '2026-05-29', 2, 'weekly_plan'),
      row('C', '2026-05-22', 9, 'kd'),
    ]);
    expect(active(res)).toHaveLength(2);
  });
});
