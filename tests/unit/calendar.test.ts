import { describe, it, expect } from 'vitest';
import { buildCalendarDays, toDateKey, KOREAN_HOLIDAYS } from '../../lib/master/calendar';

describe('buildCalendarDays (T2.4)', () => {
  const days = buildCalendarDays(2026, 2027);
  const byKey = new Map(days.map((d) => [toDateKey(d.date), d]));

  it('AC T2.4-1: 약 730 row (2년치), 영업일 약 500일', () => {
    expect(days.length).toBe(730);
    const workdays = days.filter((d) => d.isWorkday).length;
    expect(workdays).toBeGreaterThan(450);
    expect(workdays).toBeLessThan(520);
  });

  it('AC T2.4-2: 2026-03-01(삼일절) → HOLIDAY, isWorkday=false', () => {
    const d = byKey.get('2026-03-01');
    expect(d?.type).toBe('HOLIDAY');
    expect(d?.isWorkday).toBe(false);
  });

  it('AC T2.4-F1: 음력 공휴일(설날·추석) 포함', () => {
    expect(byKey.get('2026-02-17')?.note).toContain('설날');
    expect(byKey.get('2026-09-25')?.note).toContain('추석');
    expect(byKey.get('2027-02-07')?.note).toContain('설날');
  });

  it('주말은 isWorkday=false (type은 NORMAL)', () => {
    // 2026-01-03 = 토요일
    const sat = byKey.get('2026-01-03');
    expect(sat?.isWorkday).toBe(false);
    expect(sat?.type).toBe('NORMAL');
  });

  it('모든 공휴일 키는 HOLIDAY로 매핑', () => {
    for (const key of Object.keys(KOREAN_HOLIDAYS)) {
      expect(byKey.get(key)?.type).toBe('HOLIDAY');
    }
  });
});
