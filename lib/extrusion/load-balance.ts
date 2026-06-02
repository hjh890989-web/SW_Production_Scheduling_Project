/**
 * 압출 라인 부하 균형 (T6.5 — AC ER-3-2·3). 순수 함수.
 * 일별·압출기별 가동률(%)과 라인 간 차이(≤10% 룰), 임계치(≥95%) 판정.
 */
export const OVERLOAD_THRESHOLD = 95;
export const BALANCE_TOLERANCE = 10;

export interface LoadEntry {
  date: string;
  extruderCode: string;
  quantity: number;
}

export interface DayLoad {
  date: string;
  utilization: Record<string, number>; // extruderCode → %
  maxDiff: number; // 라인 간 최대 차이(%)
  balanced: boolean; // ≤10%
  overloaded: string[]; // ≥95% 라인
}

export function loadBalanceByDay(
  entries: LoadEntry[],
  extruderCodes: string[],
  dailyCapacity: number,
): DayLoad[] {
  const dates = [...new Set(entries.map((e) => e.date))].sort();
  return dates.map((date) => {
    const utilization: Record<string, number> = {};
    for (const code of extruderCodes) {
      const qty = entries.filter((e) => e.date === date && e.extruderCode === code).reduce((a, e) => a + e.quantity, 0);
      utilization[code] = dailyCapacity > 0 ? Math.round((qty / dailyCapacity) * 100) : 0;
    }
    const pcts = extruderCodes.map((c) => utilization[c]);
    const maxDiff = pcts.length ? Math.max(...pcts) - Math.min(...pcts) : 0;
    const overloaded = extruderCodes.filter((c) => utilization[c] >= OVERLOAD_THRESHOLD);
    return { date, utilization, maxDiff, balanced: maxDiff <= BALANCE_TOLERANCE, overloaded };
  });
}
