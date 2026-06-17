import ExcelJS from 'exceljs';

export type CellValue = string | number | boolean | null | undefined;
export type Workbook = ExcelJS.Workbook;

/** Excel epoch (1899-12-30, 1900 윤년 버그 보정) — Date ↔ serial 변환 기준. */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

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

/** exceljs 셀 → CellValue (xlsx sheet_to_json 호환: Date는 Excel serial로, 수식/리치텍스트는 결과/텍스트로). */
function cellToValue(v: unknown): CellValue {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Math.round((v.getTime() - EXCEL_EPOCH) / 86_400_000);
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  const o = v as Record<string, unknown>;
  if (o.result !== undefined) return cellToValue(o.result); // formula / sharedFormula
  if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((t) => t.text ?? '').join('');
  if (o.text !== undefined) return String(o.text); // hyperlink
  return null; // error 등
}

/**
 * 워크시트 → 2차원 matrix (xlsx `header:1, blankrows:false, defval:null` 동등).
 *
 * ws.rowCount/columnCount(또는 getCell 순회)는 값 없이 스타일만 있는 "유령 영역"까지
 * 포함할 수 있어, 그 범위를 dense하게 순회하면 수백만 셀을 할당해 힙 OOM이 난다.
 * 따라서 실제 값이 있는 셀만 sparse 순회하고, 데이터가 존재하는 최대 열까지만 정규화한다.
 */
function worksheetToMatrix(ws: ExcelJS.Worksheet): CellValue[][] {
  const rows: CellValue[][] = [];
  let maxCol = 0;
  ws.eachRow({ includeEmpty: false }, (row) => {
    const arr: CellValue[] = [];
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const v = cellToValue(cell.value);
      arr[colNumber - 1] = v;
      if (v !== null && v !== undefined && v !== '') {
        hasValue = true;
        if (colNumber > maxCol) maxCol = colNumber; // 값 있는 셀만 폭에 반영(유령 열 배제)
      }
    });
    if (hasValue) rows.push(arr); // blankrows:false
  });
  // dense 직사각형 보장(파서가 고정 열 인덱스로 접근) — 폭은 실제 데이터 최대 열까지만.
  return rows.map((arr) => {
    const dense: CellValue[] = new Array(maxCol);
    for (let c = 0; c < maxCol; c += 1) dense[c] = arr[c] ?? null;
    return dense;
  });
}

/** 버퍼/ArrayBuffer → 워크북(async). 업로드 서버액션에서 사용. */
export async function loadWorkbook(data: ArrayBuffer | Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs .d.ts의 Buffer 타입이 @types/node 20과 어긋나 캐스팅으로 회피(런타임은 ArrayBuffer/Buffer 모두 수용).
  await wb.xlsx.load(data as Parameters<typeof wb.xlsx.load>[0]);
  return wb;
}

/** 워크북의 시트명 목록. */
export function workbookSheetNames(wb: ExcelJS.Workbook): string[] {
  return wb.worksheets.map((w) => w.name);
}

/** 워크북의 특정 시트 → matrix. 없으면 빈 배열. */
export function workbookMatrix(wb: ExcelJS.Workbook, name: string): CellValue[][] {
  const ws = wb.getWorksheet(name);
  return ws ? worksheetToMatrix(ws) : [];
}

/** 파일의 특정 시트를 2차원 matrix로 읽는다(헤더 없이 raw). */
export async function readSheetMatrix(filePath: string, sheetName?: string): Promise<CellValue[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0];
  if (!ws) throw new Error(`시트를 찾을 수 없습니다: ${sheetName ?? '(first)'}`);
  return worksheetToMatrix(ws);
}

/** 파일의 시트 목록. */
export async function listSheets(filePath: string): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb.worksheets.map((w) => w.name);
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
