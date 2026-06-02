import { describe, it, expect } from 'vitest';
import { dieChangeSummary } from './die-change-summary';
import type { ChangeEntry } from '@/lib/extrusion/die-change';

const e = (date: string, shift: string, g: number, hp: string): ChangeEntry => ({
  extruderCode: 'FORD', date, shift, extrusionGroup: g, headPin: hp,
});

describe('dieChangeSummary (T6.4 KSF-2)', () => {
  it('일별 변경 + baseline 대비 감소율', () => {
    // 1일, 변경 1회, baseline 7 → 감소율 ~85.7%
    const s = dieChangeSummary([e('2026-05-18', 'DAY_FIRST', 1, '22*8'), e('2026-05-18', 'DAY_SECOND', 2, '25*8')]);
    expect(s.days).toBe(1);
    expect(s.autoTotal).toBe(1);
    expect(s.baselineTotal).toBe(7);
    expect(s.reductionPct).toBeGreaterThan(30);
  });

  it('AC T6.4-1: -30% 목표 충족 시나리오', () => {
    // baseline 7/일, 자동 4회/일이면 감소율 ~42.8% (≥30%)
    const entries: ChangeEntry[] = [];
    let g = 1;
    for (const sh of ['DAY_FIRST', 'DAY_SECOND', 'NIGHT_FIRST', 'NIGHT_SECOND', 'DAY_FIRST']) {
      entries.push(e('2026-05-18', sh, g, `${g}`));
      g += 1;
    }
    const s = dieChangeSummary(entries);
    expect(s.reductionPct).toBeGreaterThanOrEqual(30);
  });

  it('빈 입력 → 0', () => {
    expect(dieChangeSummary([])).toMatchObject({ autoTotal: 0, baselineTotal: 0, reductionPct: 0 });
  });
});
