import { describe, it, expect } from 'vitest';
import { buildQuarterlyReport, quarterRange, type SnapshotInput } from './quarterly-report';

const snaps: SnapshotInput[] = [
  { date: '2026-04-05', ksf1Punctuality: 0.8, ksf5Unification: 0.5, ksf6Adoption: null }, // before
  { date: '2026-04-15', ksf1Punctuality: 0.9, ksf5Unification: 0.6, ksf6Adoption: null }, // before
  { date: '2026-05-10', ksf1Punctuality: 0.95, ksf5Unification: 0.9, ksf6Adoption: 0.7 }, // after
  { date: '2026-06-20', ksf1Punctuality: 0.97, ksf5Unification: 1.0, ksf6Adoption: 0.8 }, // after
  { date: '2026-07-01', ksf1Punctuality: 0.5, ksf5Unification: 0.5, ksf6Adoption: 0.5 }, // 범위 밖(Q3)
];

describe('quarterRange (T8.3)', () => {
  it('YYYY-Q[1-4] → 분기 시작·종료', () => {
    expect(quarterRange('2026-Q2')).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(quarterRange('2026-Q1')).toEqual({ start: '2026-01-01', end: '2026-03-31' });
    expect(quarterRange('2026-Q4')).toEqual({ start: '2026-10-01', end: '2026-12-31' });
  });

  it('잘못된 분기는 throw', () => {
    expect(() => quarterRange('2026-Q5')).toThrow();
  });
});

describe('buildQuarterlyReport (T8.3)', () => {
  const report = buildQuarterlyReport(snaps, '2026-05-01', '2026-Q2');

  it('분기 범위 밖(Q3) 데이터는 제외', () => {
    expect(report.series).toHaveLength(4);
    expect(report.series.every((s) => s.date <= '2026-06-30')).toBe(true);
  });

  it('도입일 기준 Before/After 분리 + 평균(null 무시)', () => {
    expect(report.before.count).toBe(2);
    expect(report.after.count).toBe(2);
    expect(report.before.ksf1Avg).toBe(0.85); // (0.8+0.9)/2
    expect(report.before.ksf6Avg).toBeNull(); // before는 모두 null
    expect(report.after.ksf6Avg).toBe(0.75); // (0.7+0.8)/2
  });

  it('delta = after − before (둘 다 값 있을 때만)', () => {
    expect(report.delta.ksf1).toBeCloseTo(0.11, 5); // 0.96 - 0.85
    expect(report.delta.ksf6).toBeNull(); // before null → delta null
  });

  it('series는 일자 오름차순 정렬', () => {
    expect(report.series.map((s) => s.date)).toEqual(['2026-04-05', '2026-04-15', '2026-05-10', '2026-06-20']);
  });
});
