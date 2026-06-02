import { describe, it, expect } from 'vitest';
import { loadBalanceByDay } from './load-balance';

describe('loadBalanceByDay (T6.5)', () => {
  it('AC T6.5-1: 두 라인 가동률 + 차이 ≤10% → balanced', () => {
    const r = loadBalanceByDay(
      [
        { date: '2026-05-18', extruderCode: 'FORD', quantity: 500 },
        { date: '2026-05-18', extruderCode: 'NEW', quantity: 500 },
      ],
      ['FORD', 'NEW'],
      1000,
    );
    expect(r[0].utilization).toEqual({ FORD: 50, NEW: 50 });
    expect(r[0].balanced).toBe(true);
    expect(r[0].maxDiff).toBe(0);
  });

  it('차이 >10% → unbalanced', () => {
    const r = loadBalanceByDay(
      [
        { date: '2026-05-18', extruderCode: 'FORD', quantity: 900 },
        { date: '2026-05-18', extruderCode: 'NEW', quantity: 100 },
      ],
      ['FORD', 'NEW'],
      1000,
    );
    expect(r[0].balanced).toBe(false);
    expect(r[0].maxDiff).toBe(80);
  });

  it('≥95% → overloaded 표기', () => {
    const r = loadBalanceByDay([{ date: '2026-05-18', extruderCode: 'FORD', quantity: 980 }], ['FORD', 'NEW'], 1000);
    expect(r[0].overloaded).toContain('FORD');
  });

  it('여러 날 정렬', () => {
    const r = loadBalanceByDay(
      [
        { date: '2026-05-19', extruderCode: 'FORD', quantity: 100 },
        { date: '2026-05-18', extruderCode: 'FORD', quantity: 100 },
      ],
      ['FORD'],
      1000,
    );
    expect(r.map((d) => d.date)).toEqual(['2026-05-18', '2026-05-19']);
  });
});
