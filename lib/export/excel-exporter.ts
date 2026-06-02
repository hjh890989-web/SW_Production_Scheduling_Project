/**
 * T8.1 엑셀 출력 — 워크북 구조(시트명·행) 생성 순수 함수.
 * 실제 .xlsx 직렬화/다운로드는 `excel-client.ts`(기존 xlsx 재사용, CORE-1)가 담당하고,
 * 본 모듈은 Next.js·xlsx 의존 없이 단위 테스트 가능한 형태로 시트 구조만 만든다.
 *
 * 시트 규약(MINOR-1): 성형/압출은 일자별 시트 `M월D일(성형)`·`M월D일(압출)`, 전체 합계는 `요약` 1장.
 */

export interface MoldingExportRow {
  date: string; // YYYY-MM-DD
  daynight: 'DAY' | 'NIGHT';
  equipmentCode: string;
  slotPosition: string;
  productCode: string;
  rotations: number;
  status: string;
}

export interface ExtrusionExportRow {
  date: string; // YYYY-MM-DD
  shift: string;
  extruderCode: string;
  productCode: string;
  quantity: number;
  headPin?: string | null;
  status: string;
}

/** 시트 1장 = 시트명 + 2차원 셀 배열(첫 행은 헤더). */
export interface SheetSpec {
  name: string;
  rows: (string | number)[][];
}

export interface WorkbookSpec {
  sheets: SheetSpec[];
  /** 성형·압출 모두 0건 → 다운로드하지 않고 안내(AC T8.1-F1). */
  isEmpty: boolean;
}

const MOLDING_HEADER = ['일자', '주야', '가류기', '슬롯', '품번', '회전수', '상태'] as const;
const EXTRUSION_HEADER = ['일자', '교대', '압출기', '품번', '수량', '헤드핀', '상태'] as const;

const DAYNIGHT_LABEL: Record<string, string> = { DAY: '주간', NIGHT: '야간' };

/** YYYY-MM-DD → `M월D일` (앞자리 0 제거). 잘못된 입력은 원문 유지. */
export function dateSheetLabel(dateISO: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return dateISO;
  return `${Number(m[2])}월${Number(m[3])}일`;
}

/** Excel 시트명 제약: 31자 이하, `: \ / ? * [ ]` 금지. */
export function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
}

function sortByDate<T extends { date: string }>(rows: T[]): string[] {
  return [...new Set(rows.map((r) => r.date))].sort();
}

/**
 * 성형·압출 스케줄 행 → 워크북 구조. 일자별 시트 + 마지막에 `요약` 시트.
 */
export function buildWorkbookSpec(
  molding: MoldingExportRow[],
  extrusion: ExtrusionExportRow[],
): WorkbookSpec {
  const isEmpty = molding.length === 0 && extrusion.length === 0;
  const sheets: SheetSpec[] = [];

  for (const date of sortByDate(molding)) {
    const dayRows = molding
      .filter((r) => r.date === date)
      .sort((a, b) => a.equipmentCode.localeCompare(b.equipmentCode) || a.slotPosition.localeCompare(b.slotPosition));
    sheets.push({
      name: sanitizeSheetName(`${dateSheetLabel(date)}(성형)`),
      rows: [
        [...MOLDING_HEADER],
        ...dayRows.map((r) => [
          r.date,
          DAYNIGHT_LABEL[r.daynight] ?? r.daynight,
          r.equipmentCode,
          r.slotPosition,
          r.productCode,
          r.rotations,
          r.status,
        ]),
      ],
    });
  }

  for (const date of sortByDate(extrusion)) {
    const dayRows = extrusion
      .filter((r) => r.date === date)
      .sort((a, b) => a.extruderCode.localeCompare(b.extruderCode) || a.productCode.localeCompare(b.productCode));
    sheets.push({
      name: sanitizeSheetName(`${dateSheetLabel(date)}(압출)`),
      rows: [
        [...EXTRUSION_HEADER],
        ...dayRows.map((r) => [
          r.date,
          r.shift,
          r.extruderCode,
          r.productCode,
          r.quantity,
          r.headPin ?? '',
          r.status,
        ]),
      ],
    });
  }

  const totalRotations = molding.reduce((s, r) => s + r.rotations, 0);
  const totalQuantity = extrusion.reduce((s, r) => s + r.quantity, 0);
  sheets.push({
    name: '요약',
    rows: [
      ['구분', '건수', '합계'],
      ['성형', molding.length, totalRotations],
      ['압출', extrusion.length, totalQuantity],
    ],
  });

  return { sheets, isEmpty };
}
