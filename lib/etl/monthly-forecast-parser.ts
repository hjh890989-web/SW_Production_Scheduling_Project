import { type CellValue, toQuantity } from '@/lib/etl/excel';
import type { Confidence, ParseResult, ParsedOrderRow } from '@/lib/orders/types';

/** 기본 연도: 헤더 일자가 'M/D(요일)' 형식이라 연도 정보가 없어 파라미터로 받는다(기본 2026). */
const DEFAULT_YEAR = 2026;

function findCol(header: CellValue[], label: string): number {
  return header.findIndex((c) => typeof c === 'string' && c.replace(/\s/g, '').includes(label));
}

/** 출처 텍스트 → confidence. 미정의 값은 MIXED fallback(+경고) (AC T3.3-F1). */
export function mapConfidence(source: string): { confidence: Confidence; warning?: string } {
  const s = source.replace(/\s/g, '');
  const hasConfirmed = s.includes('확정');
  const hasForecast = s.includes('예상');
  if (hasConfirmed && hasForecast) return { confidence: 'MIXED' };
  if (hasConfirmed) return { confidence: 'CONFIRMED' };
  if (hasForecast) return { confidence: 'FORECAST' };
  return { confidence: 'MIXED', warning: `미정의 출처 값 "${source}" → MIXED fallback` };
}

/** 'M/D(요일)' → 'YYYY-MM-DD'. 매칭 실패·달력상 무효(예: 2/30) 시 null(SEC). */
function headerToISO(cell: CellValue, year: number): string | null {
  if (typeof cell !== 'string') return null;
  const m = cell.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const iso = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00.000Z`);
  // 롤오버(2/30→3/2) 없이 정확히 동일한 일자만 유효
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * 월예상 통합 수주정보 파서 (T3.3). 헤더 r4(index3) + 데이터 r5+(index4).
 * 1주차·2주차 일자 unpivot, 출처(Y열)→confidence, sourceType=monthly_forecast.
 */
export function parseMonthlyForecast(matrix: CellValue[][], year: number = DEFAULT_YEAR): ParseResult {
  const errors: string[] = [];
  const rows: ParsedOrderRow[] = [];

  if (matrix.length < 5) return { rows, errors: ['행이 부족합니다.'] };
  const header = matrix[3] ?? [];

  const codeCol = findCol(header, '생산품번') >= 0 ? findCol(header, '생산품번') : 9;
  const materialCol = findCol(header, '구분') >= 0 ? findCol(header, '구분') : 1;
  const typeCol = findCol(header, '납품유형') >= 0 ? findCol(header, '납품유형') : 2;
  const sourceCol = findCol(header, '출처');

  const dateCols = header
    .map((c, i) => ({ i, iso: headerToISO(c, year) }))
    .filter((x) => x.iso !== null) as { i: number; iso: string }[];

  if (dateCols.length === 0) return { rows, errors: ['일자 컬럼(M/D)을 찾지 못했습니다.'] };

  for (let r = 4; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const material = String(row[materialCol] ?? '').trim();
    const rawProductCode = String(row[codeCol] ?? '').trim();
    if (!rawProductCode) continue;
    if (material && material !== '실리콘') continue;

    const { confidence, warning } = mapConfidence(sourceCol >= 0 ? String(row[sourceCol] ?? '') : '');
    if (warning) errors.push(`${rawProductCode}: ${warning}`);
    const orderType = String(row[typeCol] ?? '').toUpperCase().includes('KD') ? 'KD' : 'OEM';

    for (const { i, iso } of dateCols) {
      const qty = toQuantity(row[i]);
      if (qty === null) continue; // SEC: 정수 수량 보장
      rows.push({ rawProductCode, deliveryDate: iso, quantity: qty, sourceType: 'monthly_forecast', confidence, orderType });
    }
  }

  return { rows, errors };
}
