import { SHIFT_ORDER, type Shift } from '@/lib/extrusion/die-change';

/**
 * 압출 백워드 스케줄러 (T6.1 — F-5.1, R-2 D-1, KSF-2). 순수 함수.
 * 핵심: (extrusionGroup, headPin) 그룹을 같은 압출기·연속 셀에 backward 채워 셋업 변경 최소화.
 *  - 신규(NEW) 호환 시 신규 우선, 아니면 포드(FORD) (부하분산은 그룹 단위 라운드).
 *  - 관체 deadline(성형투입-1, D-1) 이내 배치. 미배치는 throw 없이 warnings.
 */
export interface ExtrusionItem {
  itemId: string;
  productCode: string;
  extrusionGroup: number | null;
  headPin: string | null;
  extruderFord: boolean;
  extruderNew: boolean;
}

export interface PipeRequestInput {
  itemId: string;
  productCode: string;
  extrusionDeadline: string; // YYYY-MM-DD (성형투입 - 1)
  pipeQuantity: number;
  orderId?: string;
}

export interface ExtruderInput {
  code: string; // FORD / NEW
  isActive: boolean;
}

export interface ExtrusionEntry {
  date: string;
  shift: Shift;
  extruderCode: string;
  itemId: string;
  productCode: string;
  quantity: number;
  extrusionGroup: number | null;
  headPin: string | null;
  status: 'AUTO';
  orderId?: string;
}

export interface ExtrusionWarning {
  itemId: string;
  orderId?: string;
  reason: string;
  shortfall?: number;
}

export interface ExtrusionInput {
  pipeRequests: PipeRequestInput[];
  items: Record<string, ExtrusionItem>;
  extruders: ExtruderInput[];
  workdays: string[]; // 오름차순 영업일
  shiftCapacity: number; // 근무당 기본 처리량
  efficiency: number; // 0~1 (예: 0.75)
}

export interface ExtrusionResult {
  schedules: ExtrusionEntry[];
  warnings: ExtrusionWarning[];
}

function lastWorkdayIndex(workdays: string[], date: string): number {
  let idx = -1;
  for (let i = 0; i < workdays.length; i += 1) {
    if (workdays[i] <= date) idx = i;
    else break;
  }
  return idx;
}

export function generateExtrusionSchedule(input: ExtrusionInput): ExtrusionResult {
  const { pipeRequests, items, extruders, workdays, shiftCapacity, efficiency } = input;
  const schedules: ExtrusionEntry[] = [];
  const warnings: ExtrusionWarning[] = [];
  const cellCap = Math.max(1, Math.floor(shiftCapacity * efficiency));
  const cellFree = new Map<string, number>(); // `${date}|${shift}|${extruder}`

  const fordActive = extruders.filter((e) => e.isActive).some((e) => e.code === 'FORD');
  const newActive = extruders.filter((e) => e.isActive).some((e) => e.code === 'NEW');

  // (extrusionGroup, headPin) 그룹화
  const groups = new Map<string, PipeRequestInput[]>();
  for (const pr of pipeRequests) {
    const it = items[pr.itemId];
    const key = it ? `${it.extrusionGroup}|${it.headPin}` : `__none__|${pr.itemId}`;
    const arr = groups.get(key);
    if (arr) arr.push(pr);
    else groups.set(key, [pr]);
  }

  // 그룹을 최소 deadline 순으로 처리, 부하분산 위해 그룹 단위로 압출기 번갈아
  const groupList = [...groups.entries()].sort((a, b) => {
    const da = Math.min(...a[1].map((p) => Date.parse(p.extrusionDeadline)));
    const db = Math.min(...b[1].map((p) => Date.parse(p.extrusionDeadline)));
    return da - db;
  });

  let rr = 0;
  for (const [, reqs] of groupList) {
    const first = items[reqs[0].itemId];
    // 신규 우선(호환 시), 아니면 포드. 부하분산 위해 둘 다 가능하면 라운드로빈.
    let extruder: string | null = null;
    const canNew = !!first?.extruderNew && newActive;
    const canFord = !!first?.extruderFord && fordActive;
    if (canNew && canFord) {
      extruder = rr % 2 === 0 ? 'NEW' : 'FORD';
      rr += 1;
    } else if (canNew) extruder = 'NEW';
    else if (canFord) extruder = 'FORD';
    else if (fordActive) extruder = 'FORD';
    else if (newActive) extruder = 'NEW';

    if (!extruder) {
      for (const pr of reqs) warnings.push({ itemId: pr.itemId, orderId: pr.orderId, reason: '가용 압출기 없음' });
      continue;
    }

    for (const pr of reqs) {
      let remaining = pr.pipeQuantity;
      const di = lastWorkdayIndex(workdays, pr.extrusionDeadline);
      if (di < 0) {
        warnings.push({ itemId: pr.itemId, orderId: pr.orderId, reason: 'D-1 마감 전 가용 영업일 없음' });
        continue;
      }
      // backward: deadline → 오늘, 같은 압출기 연속 셀
      for (let d = di; d >= 0 && remaining > 0; d -= 1) {
        for (const shift of SHIFT_ORDER) {
          const key = `${workdays[d]}|${shift}|${extruder}`;
          const free = cellFree.has(key) ? (cellFree.get(key) as number) : cellCap;
          if (free <= 0) continue;
          const take = Math.min(free, remaining);
          cellFree.set(key, free - take);
          schedules.push({
            date: workdays[d], shift, extruderCode: extruder, itemId: pr.itemId, productCode: pr.productCode,
            quantity: take, extrusionGroup: first?.extrusionGroup ?? null, headPin: first?.headPin ?? null,
            status: 'AUTO', orderId: pr.orderId,
          });
          remaining -= take;
          if (remaining <= 0) break;
        }
      }
      if (remaining > 0) {
        warnings.push({ itemId: pr.itemId, orderId: pr.orderId, reason: '가용 셀 부족 — 부분 배치', shortfall: remaining });
      }
    }
  }

  return { schedules, warnings };
}
