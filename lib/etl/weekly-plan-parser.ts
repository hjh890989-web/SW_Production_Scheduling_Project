import { type CellValue, excelSerialToISO, isDateSerial, toQuantity } from '@/lib/etl/excel';
import type { ParseResult, ParsedOrderRow } from '@/lib/orders/types';

/**
 * 주간 계획 파서 (T3.1 — 1순위 truth 파일).
 * 레이아웃: 헤더 r2(index1) + 일자 직렬 r3(index2), 생산품번 컬럼, K~P 일자별 수량.
 * Wide → Long unpivot, A열 '실리콘' 필터, sourceType=weekly_plan/confidence=CONFIRMED.
 */
function findCol(header: CellValue[], label: string): number {
  return header.findIndex((c) => typeof c === 'string' && c.replace(/\s/g, '').includes(label));
}

export function parseWeeklyPlan(matrix: CellValue[][]): ParseResult {
  const errors: string[] = [];
  const rows: ParsedOrderRow[] = [];

  if (matrix.length < 4) {
    return { rows, errors: ['행이 부족합니다(헤더/일자/데이터 필요).'] };
  }

  const header = matrix[1] ?? [];
  const dateRow = matrix[2] ?? [];

  const codeCol = findCol(header, '생산품번') >= 0 ? findCol(header, '생산품번') : 8;
  const materialCol = findCol(header, '구분') >= 0 ? findCol(header, '구분') : 0;
  const typeCol = findCol(header, '납품유형') >= 0 ? findCol(header, '납품유형') : 1;

  // 일자 컬럼: dateRow에서 Excel 직렬 날짜인 셀
  const dateCols = dateRow
    .map((v, i) => (isDateSerial(v) ? i : -1))
    .filter((i) => i >= 0);

  if (dateCols.length === 0) {
    return { rows, errors: ['일자 컬럼(직렬 날짜)을 찾지 못했습니다 — 양식이 깨졌을 수 있습니다.'] };
  }

  for (let r = 3; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const material = String(row[materialCol] ?? '').trim();
    const rawProductCode = String(row[codeCol] ?? '').trim();
    if (!rawProductCode) continue;
    if (material && material !== '실리콘') continue; // A열 실리콘 필터(1차)

    const orderType = String(row[typeCol] ?? '').toUpperCase().includes('KD') ? 'KD' : 'OEM';

    for (const c of dateCols) {
      const qty = toQuantity(row[c]);
      if (qty === null) continue; // 0/빈/소수/범위초과 셀 제외 (AC T3.1-2, SEC: 정수 보장)
      rows.push({
        rawProductCode,
        deliveryDate: excelSerialToISO(dateRow[c] as number),
        quantity: qty,
        sourceType: 'weekly_plan',
        confidence: 'CONFIRMED',
        orderType,
      });
    }
  }

  return { rows, errors };
}
