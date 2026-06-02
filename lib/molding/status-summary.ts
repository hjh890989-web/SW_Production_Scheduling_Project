import type { GridCell, MoldingStatus } from '@/lib/gantt/types';

/** 상태별 셀 수 집계 (T5.8 — 자동/수동/확정 시각 구분). 순수 함수. */
export interface StatusSummary {
  AUTO: number;
  MANUAL: number;
  CONFIRMED: number;
  total: number;
  ruleViolations: number;
}

export function summarizeStatus(cells: Pick<GridCell, 'status' | 'ruleViolation'>[]): StatusSummary {
  const s: StatusSummary = { AUTO: 0, MANUAL: 0, CONFIRMED: 0, total: 0, ruleViolations: 0 };
  for (const c of cells) {
    s[c.status as MoldingStatus] += 1;
    s.total += 1;
    if (c.ruleViolation) s.ruleViolations += 1;
  }
  return s;
}
