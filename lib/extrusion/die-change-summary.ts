import { dailySetupChanges, type ChangeEntry } from '@/lib/extrusion/die-change';

/**
 * 다이/노즐 변경 Before vs After 요약 (T6.4 — KSF-2 -30% 목표). 순수 함수.
 * 수기 baseline(일 5~10회, 기본 7) 대비 자동 결과 감소율 계산. (계획 기준; MES 실적 연동은 Sprint 9.)
 */
export const BASELINE_CHANGES_PER_DAY = 7;

export interface DieChangeSummary {
  daily: Record<string, number>;
  autoTotal: number;
  baselineTotal: number;
  reductionPct: number; // 감소율(%) — 양수면 개선
  days: number;
}

export function dieChangeSummary(
  entries: ChangeEntry[],
  baselinePerDay: number = BASELINE_CHANGES_PER_DAY,
): DieChangeSummary {
  const daily = dailySetupChanges(entries);
  const days = Object.keys(daily).length;
  const autoTotal = Object.values(daily).reduce((a, b) => a + b, 0);
  const baselineTotal = days * baselinePerDay;
  const reductionPct = baselineTotal > 0 ? ((baselineTotal - autoTotal) / baselineTotal) * 100 : 0;
  return { daily, autoTotal, baselineTotal, reductionPct, days };
}
