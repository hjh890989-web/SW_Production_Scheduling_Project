import { SHIFT_ORDER, type Shift } from '@/lib/extrusion/die-change';
import type { MoldingStatus } from '@/lib/gantt/types';

/**
 * W-5 압출 그리드 어댑터 (T6.2). 행 = 압출기 × 근무(4), 열 = 영업일. 순수 함수.
 */
export interface ExtColumn {
  date: string;
  label: string;
  isWorkday: boolean;
  key: string;
}

export interface ExtRow {
  extruderCode: string;
  shift: Shift;
  label: string;
  key: string;
}

export interface ExtCell {
  rowKey: string;
  colKey: string;
  itemId: string;
  productCode: string;
  quantity: number;
  extrusionGroup: number | null;
  headPin: string | null;
  status: MoldingStatus;
  ruleViolation: boolean;
  scheduleId?: string;
  updatedAt?: string;
}

export interface ExtGridModel {
  columns: ExtColumn[];
  rows: ExtRow[];
  cells: ExtCell[];
}

const SHIFT_LABEL: Record<Shift, string> = {
  DAY_FIRST: '주-전반',
  DAY_SECOND: '주-후반',
  NIGHT_FIRST: '야-전반',
  NIGHT_SECOND: '야-후반',
};

export function buildExtColumns(calendar: { date: string; isWorkday: boolean }[]): ExtColumn[] {
  return calendar.map((c) => ({ date: c.date, isWorkday: c.isWorkday, label: c.date.slice(5), key: c.date }));
}

export function buildExtRows(extruders: { code: string; name: string }[]): ExtRow[] {
  const rows: ExtRow[] = [];
  for (const e of extruders) {
    for (const shift of SHIFT_ORDER) {
      rows.push({ extruderCode: e.code, shift, label: `${e.code} ${SHIFT_LABEL[shift]}`, key: `${e.code}_${shift}` });
    }
  }
  return rows;
}

export interface ExtEntryInput {
  date: string;
  shift: Shift;
  extruderCode: string;
  itemId: string;
  productCode: string;
  quantity: number;
  extrusionGroup: number | null;
  headPin: string | null;
  status: MoldingStatus;
  ruleViolation?: boolean;
  scheduleId?: string;
  updatedAt?: string;
}

export function buildExtCells(entries: ExtEntryInput[]): ExtCell[] {
  return entries.map((e) => ({
    rowKey: `${e.extruderCode}_${e.shift}`,
    colKey: e.date,
    itemId: e.itemId,
    productCode: e.productCode,
    quantity: e.quantity,
    extrusionGroup: e.extrusionGroup,
    headPin: e.headPin,
    status: e.status,
    ruleViolation: e.ruleViolation ?? false,
    scheduleId: e.scheduleId,
    updatedAt: e.updatedAt,
  }));
}

export function buildExtGrid(
  calendar: { date: string; isWorkday: boolean }[],
  extruders: { code: string; name: string }[],
  entries: ExtEntryInput[],
): ExtGridModel {
  return { columns: buildExtColumns(calendar), rows: buildExtRows(extruders), cells: buildExtCells(entries) };
}
