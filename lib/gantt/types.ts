/**
 * W-4 슬롯 그리드 데이터 구조 (T5.1, CORE-1 커스텀 그리드).
 * 행 = 가류기 × 슬롯, 열 = 영업일 × 주/야, 셀 = 배치(품번·회전수·status).
 */
export type DayNight = 'DAY' | 'NIGHT';
export type MoldingStatus = 'AUTO' | 'MANUAL' | 'CONFIRMED';

export interface GridColumn {
  date: string; // YYYY-MM-DD
  daynight: DayNight;
  isWorkday: boolean;
  label: string;
  key: string; // `${date}_${daynight}`
}

export interface GridRow {
  equipmentCode: string;
  equipmentName: string;
  slot: string;
  key: string; // `${equipmentCode}_${slot}`
}

export interface GridCell {
  rowKey: string;
  colKey: string;
  itemId: string;
  productCode: string;
  rotations: number;
  status: MoldingStatus;
  ruleViolation: boolean;
  prebuild?: boolean; // 선행생산(미래 납기 당겨 채움)
  scheduleId?: string;
  updatedAt?: string;
}

export interface GridModel {
  columns: GridColumn[];
  rows: GridRow[];
  cells: GridCell[];
}
