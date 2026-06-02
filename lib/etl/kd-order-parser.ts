import { type CellValue, excelSerialToISO, isDateSerial, toNumber, readSheetMatrix, listSheets } from '@/lib/etl/excel';
import type { ParseResult, ParsedOrderRow } from '@/lib/orders/types';

export const KD_SHEET_NAME = 'kd 발주';

// 컬럼 인덱스: 품번 C(2), 납입요청일 변경 E(4), 수량 G(6), 납입요청일 원본 K(10)
const COL = { productCode: 2, dateChanged: 4, quantity: 6, dateOriginal: 10 } as const;

/**
 * KD 발주 파서 (T3.2). 'kd 발주' 시트만 대상.
 * 납입요청일 우선순위: E열(변경) > K열(원본) (AC T3.2-2). sourceType=kd / orderType=KD.
 * 데이터 행 형태(품번 문자열 + 수량 숫자 + 일자 직렬)로 스캔해 헤더/합계 행을 자연 제외.
 */
export function parseKdOrder(matrix: CellValue[][]): ParseResult {
  const errors: string[] = [];
  const rows: ParsedOrderRow[] = [];

  for (const row of matrix) {
    const rawProductCode = String(row[COL.productCode] ?? '').trim();
    const quantity = toNumber(row[COL.quantity]);
    const serial = isDateSerial(row[COL.dateChanged])
      ? (row[COL.dateChanged] as number)
      : isDateSerial(row[COL.dateOriginal])
        ? (row[COL.dateOriginal] as number)
        : null;

    if (!rawProductCode || !quantity || quantity <= 0 || serial === null) continue;

    rows.push({
      rawProductCode,
      deliveryDate: excelSerialToISO(serial),
      quantity,
      sourceType: 'kd',
      confidence: 'CONFIRMED',
      orderType: 'KD',
    });
  }

  if (rows.length === 0) errors.push('KD 발주 데이터 행을 찾지 못했습니다 — 양식을 확인하세요.');
  return { rows, errors };
}

/** 파일에서 'kd 발주' 시트를 읽어 파싱. 시트 누락 시 명확한 에러 (AC T3.2-F1). */
export function parseKdOrderFile(filePath: string): ParseResult {
  const sheets = listSheets(filePath);
  if (!sheets.includes(KD_SHEET_NAME)) {
    return { rows: [], errors: [`'${KD_SHEET_NAME}' 시트가 없습니다. 시트명을 확인하세요. (존재: ${sheets.join(', ')})`] };
  }
  return parseKdOrder(readSheetMatrix(filePath, KD_SHEET_NAME));
}
