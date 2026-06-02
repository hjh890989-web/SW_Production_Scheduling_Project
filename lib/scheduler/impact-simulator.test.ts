import { describe, it, expect } from 'vitest';
import { simulateImpact, type ScheduleRef } from './impact-simulator';

function ref(itemId: string, status: string, process: 'MOLDING' | 'EXTRUSION' = 'MOLDING'): ScheduleRef {
  return { process, scheduleId: `${itemId}-${status}`, itemId, productCode: itemId, date: '2026-05-20', status, rowKey: 'LP_1_LP_TOP_1', colKey: '2026-05-20_DAY' };
}

describe('simulateImpact (T7.1)', () => {
  const schedules = [
    ref('P1', 'AUTO'),
    ref('P1', 'CONFIRMED'),
    ref('P1', 'STARTED'),
    ref('P2', 'AUTO'),
    ref('P1', 'AUTO', 'EXTRUSION'),
  ];

  it('AC T7.1-1: 같은 품번의 영향받는 건만 식별', () => {
    const r = simulateImpact({ itemId: 'P1', changeType: '수량', newValue: '500' }, schedules);
    expect(r.total).toBe(4); // P1 4건 (P2 제외)
    expect(r.affected.every((a) => a.itemId === 'P1')).toBe(true);
  });

  it('status별 색상 분류 카운트', () => {
    const r = simulateImpact({ itemId: 'P1', changeType: '수량' }, schedules);
    expect(r.counts).toMatchObject({ critical: 1, warning: 1, auto: 2 });
  });

  it('AC T7.1-2: 좌표(rowKey/colKey/process) 반환', () => {
    const r = simulateImpact({ itemId: 'P1', changeType: '일자' }, schedules);
    expect(r.affected[0]).toMatchObject({ rowKey: 'LP_1_LP_TOP_1', colKey: '2026-05-20_DAY', process: 'MOLDING' });
  });

  it('영향 없음 → 빈 결과(throw X)', () => {
    expect(simulateImpact({ itemId: 'NONE', changeType: '취소' }, schedules).total).toBe(0);
  });

  it('AC T7.1-F1: Degraded Mode 플래그 전달', () => {
    expect(simulateImpact({ itemId: 'P1', changeType: '수량' }, schedules, { degraded: true }).degraded).toBe(true);
  });

  it('dryRun: 입력 schedules 불변(부작용 없음)', () => {
    const copy = JSON.parse(JSON.stringify(schedules));
    simulateImpact({ itemId: 'P1', changeType: '수량' }, schedules);
    expect(schedules).toEqual(copy);
  });
});
