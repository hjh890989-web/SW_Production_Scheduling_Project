/**
 * T8.3 분기 리포트 — KSF Daily Snapshot을 분기 단위로 집계하고 도입 전/후(Before/After)를 비교.
 * 30분 수기 작업을 30초 자동 집계로 대체(AC EX-2-2). 출력은 window.print()(CORE-2).
 */

export interface SnapshotInput {
  date: string; // YYYY-MM-DD
  ksf1Punctuality: number | null; // 납기율
  ksf5Unification: number | null; // 수주 일원화율
  ksf6Adoption: number | null; // 수동보정 채택률
}

export interface PeriodStat {
  count: number;
  ksf1Avg: number | null;
  ksf5Avg: number | null;
  ksf6Avg: number | null;
}

export interface QuarterlyReport {
  quarter: string; // 예: "2026-Q2"
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string; // YYYY-MM-DD
  adoptionDate: string; // 도입일 경계(YYYY-MM-DD)
  before: PeriodStat;
  after: PeriodStat;
  /** after − before (둘 다 값이 있을 때만, 없으면 null). */
  delta: { ksf1: number | null; ksf5: number | null; ksf6: number | null };
  series: SnapshotInput[]; // 차트용 일자 정렬 시계열
}

/** "YYYY-Q[1-4]" → 분기 시작·종료(YYYY-MM-DD). 잘못된 입력은 throw. */
export function quarterRange(quarter: string): { start: string; end: string } {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!m) throw new Error(`invalid quarter: ${quarter}`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  const startMonth = (q - 1) * 3 + 1; // 1,4,7,10
  const endMonth = startMonth + 2; // 3,6,9,12
  const endDay = [4, 6, 9, 11].includes(endMonth) ? 30 : endMonth === 2 ? 28 : 31;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(endDay)}` };
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 1000) / 1000;
}

function stat(rows: SnapshotInput[]): PeriodStat {
  return {
    count: rows.length,
    ksf1Avg: avg(rows.map((r) => r.ksf1Punctuality)),
    ksf5Avg: avg(rows.map((r) => r.ksf5Unification)),
    ksf6Avg: avg(rows.map((r) => r.ksf6Adoption)),
  };
}

function diff(after: number | null, before: number | null): number | null {
  if (after === null || before === null) return null;
  return Math.round((after - before) * 1000) / 1000;
}

/**
 * 분기 스냅샷을 도입일 기준 전/후로 나눠 집계. adoptionDate 미만은 Before, 이상은 After.
 */
export function buildQuarterlyReport(
  snapshots: SnapshotInput[],
  adoptionDate: string,
  quarter: string,
): QuarterlyReport {
  const { start, end } = quarterRange(quarter);
  const inRange = snapshots.filter((s) => s.date >= start && s.date <= end);
  const series = [...inRange].sort((a, b) => a.date.localeCompare(b.date));

  const before = stat(series.filter((s) => s.date < adoptionDate));
  const after = stat(series.filter((s) => s.date >= adoptionDate));

  return {
    quarter,
    rangeStart: start,
    rangeEnd: end,
    adoptionDate,
    before,
    after,
    delta: {
      ksf1: diff(after.ksf1Avg, before.ksf1Avg),
      ksf5: diff(after.ksf5Avg, before.ksf5Avg),
      ksf6: diff(after.ksf6Avg, before.ksf6Avg),
    },
    series,
  };
}
