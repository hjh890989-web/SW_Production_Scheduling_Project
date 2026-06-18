import { type CellValue, MAX_QUANTITY } from '@/lib/etl/excel';
import type { ParseResult, ParsedOrderRow } from '@/lib/orders/types';

/**
 * "월 예상 매출 계획" 파서 (통합_수주정보와 다른 레이아웃).
 * - 헤더 행: '생산품번'을 포함한 행을 동적 탐색(파일마다 위치가 달라 고정 인덱스 금지)
 * - 품번: '생산품번' 컬럼, 종류: '종류' 컬럼(실리콘만)
 * - 수량: '1주'~'5주' 주차 컬럼(N~R) — 예상값이라 소수 가능 → 반올림 정수화
 * - 납기일: 날짜 컬럼이 없어 'M월 N주'를 그 달 N*7일(말일 초과 시 말일)로 환산
 *   (예상 계획이므로 주차 버킷 대표일. 확정 주간/KD 수주가 들어오면 우선순위로 supersede)
 */
const DEFAULT_YEAR = 2026;

function despace(v: CellValue): string {
  return typeof v === 'string' ? v.replace(/\s/g, '') : '';
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseSalesForecast(matrix: CellValue[][], month: number, year: number = DEFAULT_YEAR): ParseResult {
  const errors: string[] = [];
  const rows: ParsedOrderRow[] = [];

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { rows, errors: ['파일명에서 월(예: 06월) 정보를 찾지 못했습니다.'] };
  }

  const headerIdx = matrix.findIndex((r) => r.some((c) => despace(c).includes('생산품번')));
  if (headerIdx < 0) return { rows, errors: ["'생산품번' 헤더를 찾지 못했습니다."] };
  const header = matrix[headerIdx];

  const codeCol = header.findIndex((c) => despace(c).includes('생산품번'));
  const kindCol = header.findIndex((c) => despace(c) === '종류');
  const weekCols = header
    .map((c, i) => ({ i, m: despace(c).match(/^([1-9])주$/) }))
    .filter((x): x is { i: number; m: RegExpMatchArray } => x.m !== null);

  if (weekCols.length === 0) return { rows, errors: ['주차 컬럼(예: 1주~5주)을 찾지 못했습니다.'] };

  const lastDay = lastDayOfMonth(year, month);

  for (let r = headerIdx + 1; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const rawProductCode = String(row[codeCol] ?? '').trim();
    if (!rawProductCode) continue;
    const kind = kindCol >= 0 ? String(row[kindCol] ?? '').trim() : '';
    if (kind && kind !== '실리콘') continue;

    for (const { i, m } of weekCols) {
      const week = Number(m[1]);
      const raw = row[i];
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) || n <= 0) continue; // 0·빈칸·음수 제외
      const quantity = Math.round(n); // 예상값 소수 → 정수화
      if (quantity <= 0 || quantity > MAX_QUANTITY) continue;

      const day = Math.min(week * 7, lastDay);
      const deliveryDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      rows.push({
        rawProductCode,
        deliveryDate,
        quantity,
        sourceType: 'monthly_forecast',
        confidence: 'FORECAST',
        orderType: 'OEM',
      });
    }
  }

  return { rows, errors };
}

/** 파일명에서 월 추출('06월' → 6). 없으면 null. */
export function monthFromFilename(filename: string): number | null {
  const m = filename.match(/(\d{1,2})\s*월/);
  if (!m) return null;
  const mm = Number(m[1]);
  return mm >= 1 && mm <= 12 ? mm : null;
}
