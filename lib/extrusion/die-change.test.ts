import { describe, it, expect } from 'vitest';
import { setupChangeCount, dailySetupChanges } from './die-change';

const e = (extruderCode: string, date: string, shift: string, g: number, hp: string) => ({
  extruderCode, date, shift, extrusionGroup: g, headPin: hp,
});

describe('setupChangeCount (T6.1/T6.4)', () => {
  it('같은 그룹 연속 → 변경 0', () => {
    expect(setupChangeCount([e('FORD', '2026-05-18', 'DAY_FIRST', 1, '22*8'), e('FORD', '2026-05-18', 'DAY_SECOND', 1, '22*8')])).toBe(0);
  });

  it('그룹 전환 → 변경 1', () => {
    expect(setupChangeCount([e('FORD', '2026-05-18', 'DAY_FIRST', 1, '22*8'), e('FORD', '2026-05-18', 'DAY_SECOND', 2, '25*8')])).toBe(1);
  });

  it('압출기별 독립 카운트', () => {
    const r = setupChangeCount([
      e('FORD', '2026-05-18', 'DAY_FIRST', 1, '22*8'),
      e('NEW', '2026-05-18', 'DAY_FIRST', 2, '25*8'),
    ]);
    expect(r).toBe(0); // 각 압출기 셀 1개씩 → 전환 없음
  });

  it('일별 집계', () => {
    const d = dailySetupChanges([
      e('FORD', '2026-05-18', 'DAY_FIRST', 1, '22*8'),
      e('FORD', '2026-05-18', 'DAY_SECOND', 2, '25*8'),
      e('FORD', '2026-05-19', 'DAY_FIRST', 3, '33*10'),
    ]);
    expect(d['2026-05-18']).toBe(1);
    expect(d['2026-05-19']).toBe(0);
  });
});
