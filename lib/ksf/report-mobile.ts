import type { QuarterlyReport } from '@/lib/export/quarterly-report';
import type { BeforeAfterMetric } from './before-after';

/**
 * T12.5.5 모바일 분기 리포트 — QuarterlyReport → 도입 前後 비교 지표 매핑(순수).
 */
export function toBeforeAfterMetrics(report: QuarterlyReport): BeforeAfterMetric[] {
  return [
    { key: 'ksf1', label: 'KSF-1 납기율', before: report.before.ksf1Avg, after: report.after.ksf1Avg },
    { key: 'ksf5', label: 'KSF-5 일원화율', before: report.before.ksf5Avg, after: report.after.ksf5Avg },
    { key: 'ksf6', label: 'KSF-6 채택률', before: report.before.ksf6Avg, after: report.after.ksf6Avg },
  ];
}
