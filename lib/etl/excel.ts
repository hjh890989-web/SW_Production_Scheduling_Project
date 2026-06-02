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
