/**
 * T12.5.3 도입 前後 비교 — 순수 함수. 모바일 비교 카드/표용 행 생성.
 */

export interface BeforeAfterMetric {
  key: string;
  label: string;
  before: number | null;
  after: number | null;
}

export interface BeforeAfterRow extends BeforeAfterMetric {
  /** (after − before) × 100, 반올림. 한쪽이라도 null이면 null. */
  deltaPct: number | null;
  /** after > before 이면 true, 같으면 false, 비교 불가 null. */
  improved: boolean | null;
}

export function compareBeforeAfter(metrics: BeforeAfterMetric[]): BeforeAfterRow[] {
  return metrics.map((m) => {
    if (m.before === null || m.after === null) {
      return { ...m, deltaPct: null, improved: null };
    }
    const deltaPct = Math.round((m.after - m.before) * 1000) / 10; // %p, 소수1
    return { ...m, deltaPct, improved: m.after > m.before };
  });
}
