import { describe, it, expect } from 'vitest';
import type { CellValue } from '@/lib/etl/excel';
import { parseSalesForecast, monthFromFilename } from './sales-forecast-parser';

// 실제 파일 레이아웃 축약: 헤더가 윗쪽 빈/요약행 뒤(여기선 index 2)에 위치.
function fixture(): CellValue[][] {
  return [
    ['실리콘 06월 예상 매출 계획', null, null, null],
    [null, null, null, null],
    ['종류', '고객사', '생산품번', '1주', '2주', '3주', '4주', '5주', '합계', '소요량'],
    ['실리콘', '화승', '28422-04900', 906.25, 906.25, 181.25, 906.25, null, 2900, 2900],
    ['실리콘', '우영', '25490-03HA0', 100, null, 0, -5, 50, 150, 150],
    ['EPDM', '평화', '99999-00000', 500, 500, 500, 500, 500, 2500, 2500], // 비실리콘 → 제외
    [null, null, null, null], // 빈 행
  ];
}

describe('parseSalesForecast', () => {
  it('주차 컬럼 unpivot + 소수 반올림 + 실리콘 필터', () => {
    const { rows, errors } = parseSalesForecast(fixture(), 6, 2026);
    expect(errors).toHaveLength(0);
    // 28422: 4주(906.25→906 ×3, 181.25→181) = 4행 / 25490: 1주(100),5주(50) = 2행 / EPDM 제외
    expect(rows).toHaveLength(6);

    const r1 = rows.filter((r) => r.rawProductCode === '28422-04900');
    expect(r1).toHaveLength(4);
    expect(r1.map((r) => r.quantity).sort((a, b) => a - b)).toEqual([181, 906, 906, 906]);
    expect(rows.every((r) => r.confidence === 'FORECAST')).toBe(true);
    expect(rows.every((r) => r.sourceType === 'monthly_forecast')).toBe(true);

    // 주차 → 납기일 (6월, N*7일)
    expect(r1.find((r) => r.quantity === 181)?.deliveryDate).toBe('2026-06-21'); // 3주
    expect(rows.find((r) => r.rawProductCode === '25490-03HA0' && r.quantity === 50)?.deliveryDate).toBe('2026-06-30'); // 5주 → 말일(30) capped from 35
  });

  it('월 정보 없거나 헤더 없으면 errors', () => {
    expect(parseSalesForecast(fixture(), 0).rows).toHaveLength(0);
    expect(parseSalesForecast([['a', 'b']], 6).errors[0]).toContain('생산품번');
  });

  it('monthFromFilename', () => {
    expect(monthFromFilename('06월 실리콘 예상 매출 계획.xlsx')).toBe(6);
    expect(monthFromFilename('실리콘 12월 예상.xlsx')).toBe(12);
    expect(monthFromFilename('예상매출.xlsx')).toBeNull();
    expect(monthFromFilename('13월.xlsx')).toBeNull();
  });
});
