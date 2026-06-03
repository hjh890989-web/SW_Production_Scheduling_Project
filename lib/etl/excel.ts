import * as XLSX from 'xlsx';

export type CellValue = string | number | boolean | null | undefined;

/**
 * Excel 직렬 날짜 → 'YYYY-MM-DD' (UTC).
 * Excel epoch = 1899-12-30 (1900 윤년 버그 보정 포함). 예: 44197 → 2021-01-01.
 */
export function excelSerialToISO(serial: number): string {
  const ms = Math.round(serial) * 86_400_000 + Date.UTC(1899, 11, 30);
  return new Date(ms).toISOString().slice(0, 10);
}

/** 셀이 Excel 날짜 직렬값으로 볼 수 있는 숫자인지(2014~2030 범위 대략). */
export function isDateSerial(v: CellValue): v is number {
  return typeof v === 'number' && v >= 41_000 && v <= 48_000;
}

/** 파일의 특정 시트를 2차원 matrix로 읽는다(헤더 없이 raw). */
export function readSheetMatrix(filePath: string, sheetName?: string): CellValue[][] {
  const wb = XLSX.readFile(filePath);
  const sn = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  if (!ws) throw new Error(`시트를 찾을 수 없습니다: ${sn}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null }) as CellValue[][];
}

/** matrix에 특정 시트가 있는지 확인용 — 시트 목록. */
export function listSheets(filePath: string): string[] {
  return XLSX.readFile(filePath).SheetNames;
}

export function toNumber(v: CellValue): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** 수량 셀 정상값 상한(PostgreSQL Int4) — overflow 방지(SEC). */
export const MAX_QUANTITY = 2_147_483_647;

/**
 * 수량 셀 → 양의 정수(SEC). 소수·Infinity·0·음수·범위초과는 null(호출부가 행 제외/경고).
 * 정수가 아닌 양수 셀(예: 1.5)이 Int 컬럼에 도달해 배치 전체가 롤백되는 사고를 막는다.
 */
export function toQuantity(v: CellValue): number | null {
  const n = toNumber(v);
  if (n === null || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > MAX_QUANTITY) return null;
  return n;
}
