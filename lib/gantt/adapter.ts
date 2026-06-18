import type { DayNight, GridColumn, GridRow, GridCell, MoldingStatus } from '@/lib/gantt/types';

const DAYNIGHT_LABEL: Record<DayNight, string> = { DAY: '주', NIGHT: '야' };

export interface CalendarInput {
  date: string; // YYYY-MM-DD
  isWorkday: boolean;
}

export interface EquipmentInput {
  code: string;
  name: string;
  slots: string[];
}

export interface ScheduleEntryInput {
  date: string;
  daynight: DayNight;
  equipmentCode: string;
  slot: string;
  itemId: string;
  productCode: string;
  rotations: number;
  status: MoldingStatus;
  ruleViolation?: boolean;
  prebuild?: boolean;
  scheduleId?: string;
  updatedAt?: string;
}

/** 영업일 목록 → 각 일자를 주/야 2개 열로 (T5.1). */
export function buildColumns(calendar: CalendarInput[]): GridColumn[] {
  const cols: GridColumn[] = [];
  for (const d of calendar) {
    for (const dn of ['DAY', 'NIGHT'] as DayNight[]) {
      cols.push({
        date: d.date,
        daynight: dn,
        isWorkday: d.isWorkday,
        label: `${d.date.slice(5)} ${DAYNIGHT_LABEL[dn]}`,
        key: `${d.date}_${dn}`,
      });
    }
  }
  return cols;
}

/** 가류기 × 슬롯 → 행 (T5.1). */
export function buildRows(equipment: EquipmentInput[]): GridRow[] {
  const rows: GridRow[] = [];
  for (const eq of equipment) {
    for (const slot of eq.slots) {
      rows.push({ equipmentCode: eq.code, equipmentName: eq.name, slot, key: `${eq.code}_${slot}` });
    }
  }
  return rows;
}

/** 스케줄 엔트리 → 셀 (row/col 키 매핑). */
export function buildCells(entries: ScheduleEntryInput[]): GridCell[] {
  return entries.map((e) => ({
    rowKey: `${e.equipmentCode}_${e.slot}`,
    colKey: `${e.date}_${e.daynight}`,
    itemId: e.itemId,
    productCode: e.productCode,
    rotations: e.rotations,
    status: e.status,
    ruleViolation: e.ruleViolation ?? false,
    prebuild: e.prebuild ?? false,
    scheduleId: e.scheduleId,
    updatedAt: e.updatedAt,
  }));
}

export function buildGrid(calendar: CalendarInput[], equipment: EquipmentInput[], entries: ScheduleEntryInput[]) {
  return { columns: buildColumns(calendar), rows: buildRows(equipment), cells: buildCells(entries) };
}
