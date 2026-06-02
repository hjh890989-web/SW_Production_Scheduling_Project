/**
 * 진행 상태 → 영향 심각도 분류 (T7.1/T7.3 — AC PM-1-1). 순수 함수.
 * STARTED/COMPLETED → critical(🔴 현장 확인), CONFIRMED → warning(🟡 재계산 가능),
 * AUTO/MANUAL → auto(🟢 자동 재계산), 그 외 → unknown(회색 fallback).
 */
export type Severity = 'critical' | 'warning' | 'auto' | 'unknown';

export function statusSeverity(status: string): Severity {
  if (status === 'STARTED' || status === 'COMPLETED') return 'critical';
  if (status === 'CONFIRMED') return 'warning';
  if (status === 'AUTO' || status === 'MANUAL') return 'auto';
  return 'unknown';
}
