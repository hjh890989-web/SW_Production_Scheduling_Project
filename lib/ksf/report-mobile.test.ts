import { describe, it, expect } from 'vitest';
import { toBeforeAfterMetrics } from './report-mobile';
import type { QuarterlyReport } from '@/lib/export/quarterly-report';

const report: QuarterlyReport = {
  quarter: '2026-Q2',
  rangeStart: '2026-04-01',
  rangeEnd: '2026-06-30',
  adoptionDate: '2026-05-01',
  before: { count: 2, ksf1Avg: 0.8, ksf5Avg: 0.6, ksf6Avg: null },
  after: { count: 2, ksf1Avg: 0.95, ksf5Avg: 0.9, ksf6Avg: 0.7 },
  delta: { ksf1: 0.15, ksf5: 0.3, ksf6: null },
  series: [],
};

describe('toBeforeAfterMetrics (T12.5.5)', () => {
  it('리포트 before/after → 3개 지표 매핑', () => {
    const metrics = toBeforeAfterMetrics(report);
    expect(metrics.map((m) => m.key)).toEqual(['ksf1', 'ksf5', 'ksf6']);
    expect(metrics[0]).toEqual({ key: 'ksf1', label: 'KSF-1 납기율', before: 0.8, after: 0.95 });
    expect(metrics[2].before).toBeNull();
  });
});
