/**
 * 성형 백워드 스케줄러 (T5.2 — R-1 D-2 하드 제약, AC MR-3 정확도 100%).
 * 순수 함수. 핵심 보장:
 *  - 슬롯 위치 X(item.allowedSlots 밖)에는 절대 배치하지 않는다 → 정확도 100%.
 *  - 모든 배치 일자는 납품일 D-2(영업일 기준)까지 → R-1.
 *  - 가용 슬롯 부족 시 throw하지 않고 가능한 만큼 배치(status=AUTO) + warnings(부분성공, AC T5.2-F1).
 */

export type DayNight = 'DAY' | 'NIGHT';
export type EquipmentType = 'MOLDING_LP' | 'MOLDING_IC';

export interface SchedulerItem {
  itemId: string;
  productCode: string;
  moldsPerAngle: number; // 앵글당 금형수 (회전당 생산 수량 기준)
  equipmentType: EquipmentType;
  allowedSlots: string[]; // 배치 가능(O) 슬롯 코드
}

export interface SchedulerEquipment {
  code: string;
  type: string; // MOLDING_LP / MOLDING_IC / EXTRUSION
  slots: string[];
  isActive: boolean;
}

export interface SchedulerOrder {
  itemId: string;
  deliveryDate: string; // YYYY-MM-DD
  quantity: number;
  orderId?: string;
}

export interface ScheduleEntry {
  date: string;
  daynight: DayNight;
  equipmentCode: string;
  slot: string;
  itemId: string;
  productCode: string;
  rotations: number;
  status: 'AUTO';
  orderId?: string;
}

export interface SchedulerWarning {
  itemId: string;
  orderId?: string;
  deliveryDate: string;
  reason: string;
  shortfallRotations?: number;
}

export interface SchedulerInput {
  orders: SchedulerOrder[];
  items: Record<string, SchedulerItem>;
  equipment: SchedulerEquipment[];
  workdays: string[]; // 오름차순 영업일 YYYY-MM-DD
  rotationsPerDay: number;
  rotationsPerNight: number;
  d2Days?: number; // 기본 2 (D-2)
}

export interface SchedulerResult {
  schedules: ScheduleEntry[];
  warnings: SchedulerWarning[];
}

/** deliveryDate 이하의 마지막 영업일 인덱스. 없으면 -1. */
function lastWorkdayIndex(workdays: string[], deliveryDate: string): number {
  let idx = -1;
  for (let i = 0; i < workdays.length; i += 1) {
    if (workdays[i] <= deliveryDate) idx = i;
    else break;
  }
  return idx;
}

export function generateMoldingSchedule(input: SchedulerInput): SchedulerResult {
  const { orders, items, equipment, workdays, rotationsPerDay, rotationsPerNight } = input;
  const d2Days = input.d2Days ?? 2;
  const schedules: ScheduleEntry[] = [];
  const warnings: SchedulerWarning[] = [];

  // 셀 잔여 회전수: `${date}|${dn}|${equipCode}|${slot}`
  const cellFree = new Map<string, number>();
  const capOf = (dn: DayNight) => (dn === 'DAY' ? rotationsPerDay : rotationsPerNight);

  const sorted = [...orders].sort((a, b) =>
    a.deliveryDate < b.deliveryDate ? -1 : a.deliveryDate > b.deliveryDate ? 1 : 0,
  );

  for (const order of sorted) {
    const item = items[order.itemId];
    if (!item) {
      warnings.push({ itemId: order.itemId, orderId: order.orderId, deliveryDate: order.deliveryDate, reason: '품번 마스터 없음' });
      continue;
    }
    if (item.moldsPerAngle <= 0) {
      warnings.push({ itemId: item.itemId, orderId: order.orderId, deliveryDate: order.deliveryDate, reason: '앵글당 금형수 0 — 회전수 계산 불가' });
      continue;
    }
    if (item.allowedSlots.length === 0) {
      warnings.push({ itemId: item.itemId, orderId: order.orderId, deliveryDate: order.deliveryDate, reason: '배치 가능 슬롯(O) 없음' });
      continue;
    }

    let rotationsNeeded = Math.ceil(order.quantity / item.moldsPerAngle);
    const di = lastWorkdayIndex(workdays, order.deliveryDate);
    const deadlineIdx = di - d2Days;
    if (deadlineIdx < 0) {
      warnings.push({ itemId: item.itemId, orderId: order.orderId, deliveryDate: order.deliveryDate, reason: 'D-2 마감 전 가용 영업일 없음' });
      continue;
    }

    // 백워드 채움: deadline → 오늘
    for (let d = deadlineIdx; d >= 0 && rotationsNeeded > 0; d -= 1) {
      const date = workdays[d];
      for (const dn of ['DAY', 'NIGHT'] as DayNight[]) {
        const cap = capOf(dn);
        for (const eq of equipment) {
          if (!eq.isActive || eq.type !== item.equipmentType) continue;
          for (const slot of eq.slots) {
            if (!item.allowedSlots.includes(slot)) continue; // 슬롯 X 배치 금지(정확도 100%)
            const key = `${date}|${dn}|${eq.code}|${slot}`;
            const free = cellFree.has(key) ? (cellFree.get(key) as number) : cap;
            if (free <= 0) continue;
            const take = Math.min(free, rotationsNeeded);
            cellFree.set(key, free - take);
            schedules.push({
              date, daynight: dn, equipmentCode: eq.code, slot,
              itemId: item.itemId, productCode: item.productCode, rotations: take, status: 'AUTO', orderId: order.orderId,
            });
            rotationsNeeded -= take;
            if (rotationsNeeded <= 0) break;
          }
          if (rotationsNeeded <= 0) break;
        }
        if (rotationsNeeded <= 0) break;
      }
    }

    if (rotationsNeeded > 0) {
      warnings.push({
        itemId: item.itemId, orderId: order.orderId, deliveryDate: order.deliveryDate,
        reason: '가용 슬롯 부족 — 부분 배치', shortfallRotations: rotationsNeeded,
      });
    }
  }

  return { schedules, warnings };
}
