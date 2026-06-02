/**
 * 다이/노즐 변경(셋업) 카운트 (T6.1/T6.4 — KSF-2). 순수 함수.
 * 같은 압출기에서 연속 셀의 (extrusionGroup, headPin)이 바뀔 때마다 1회 변경.
 */
export const SHIFT_ORDER = ['DAY_FIRST', 'DAY_SECOND', 'NIGHT_FIRST', 'NIGHT_SECOND'] as const;
export type Shift = (typeof SHIFT_ORDER)[number];

export interface ChangeEntry {
  extruderCode: string;
  date: string; // YYYY-MM-DD
  shift: string;
  extrusionGroup: number | null;
  headPin: string | null;
}

function cellKey(e: ChangeEntry): string {
  return `${e.date}|${e.shift}`;
}

function cellOrder(e: ChangeEntry): string {
  const si = SHIFT_ORDER.indexOf(e.shift as Shift);
  return `${e.date}|${String(si < 0 ? 9 : si)}`;
}

/** 압출기별 연속 셀의 (E그룹,헤드핀) 전환 횟수 합. */
export function setupChangeCount(entries: ChangeEntry[]): number {
  const byExtruder = new Map<string, ChangeEntry[]>();
  for (const e of entries) {
    const arr = byExtruder.get(e.extruderCode);
    if (arr) arr.push(e);
    else byExtruder.set(e.extruderCode, [e]);
  }

  let changes = 0;
  for (const list of byExtruder.values()) {
    // 셀 단위로 정렬·중복 제거(셀의 그룹 = 첫 엔트리 기준)
    const cells = new Map<string, { order: string; sig: string }>();
    for (const e of list) {
      const k = cellKey(e);
      if (!cells.has(k)) cells.set(k, { order: cellOrder(e), sig: `${e.extrusionGroup}|${e.headPin}` });
    }
    const ordered = [...cells.values()].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].sig !== ordered[i - 1].sig) changes += 1;
    }
  }
  return changes;
}

/** 일별 다이/노즐 변경 횟수 (대시보드·W-5 표시용). */
export function dailySetupChanges(entries: ChangeEntry[]): Record<string, number> {
  const byDate = new Map<string, ChangeEntry[]>();
  for (const e of entries) {
    const arr = byDate.get(e.date);
    if (arr) arr.push(e);
    else byDate.set(e.date, [e]);
  }
  const result: Record<string, number> = {};
  for (const [date, list] of byDate) result[date] = setupChangeCount(list);
  return result;
}
