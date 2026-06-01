import { describe, it, expect } from 'vitest';
import { parseMonthlyForecast, mapConfidence } from './monthly-forecast-parser';

const HEADER = [
  'No', '구분', '납품유형', '종류', '차종', '사양', '후가공', '납품처', '고객사품번', '생산품번', '화승품번',
  '2/2(월)', '2/3(화)', '2/4(수)', '2/5(목)', '2/6(금)', '합계', '출처',
];
function base(dataRows: (string | number | null)[][]) {
  return [['통합 수주정보'], ['범례'], ['주차'], HEADER, ...dataRows];
}
// 생산품번=index9, 날짜=11~15, 합계=16, 출처=17
function row(code: string, qtys: (number | null)[], source: string, type = 'KD') {
  const r: (string | number | null)[] = new Array(18).fill(null);
  r[1] = '실리콘'; r[2] = type; r[9] = code;
  qtys.forEach((q, i) => { r[11 + i] = q; });
  r[17] = source;
  return r;
}

describe('mapConfidence (T3.3)', () => {
  it('확정→CONFIRMED, 예상→FORECAST, 예상/확정→MIXED', () => {
    expect(mapConfidence('확정').confidence).toBe('CONFIRMED');
    expect(mapConfidence('예상').confidence).toBe('FORECAST');
    expect(mapConfidence('예상/확정').confidence).toBe('MIXED');
  });
  it('AC T3.3-F1: 미정의 출처 → MIXED + 경고', () => {
    const r = mapConfidence('기타');
    expect(r.confidence).toBe('MIXED');
    expect(r.warning).toBeTruthy();
  });
});

describe('parseMonthlyForecast (T3.3)', () => {
  it('AC T3.3-1: unpivot + confidence 분류', () => {
    const { rows } = parseMonthlyForecast(base([row('25451-P7200', [11000, null, null, null, null], '예상/확정')]), 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ deliveryDate: '2026-02-02', quantity: 11000, sourceType: 'monthly_forecast', confidence: 'MIXED', orderType: 'KD' });
  });

  it('AC T3.3-2: 같은 값 여러 일 반복 → 각 일자 적재', () => {
    const { rows } = parseMonthlyForecast(base([row('P2', [688, 688, 688, null, null], '확정')]), 2026);
    expect(rows).toHaveLength(3);
    expect(rows.every((x) => x.quantity === 688 && x.confidence === 'CONFIRMED')).toBe(true);
  });

  it('AC T3.3-F1: 출처=기타 → MIXED + 경고 errors', () => {
    const { rows, errors } = parseMonthlyForecast(base([row('P3', [10, null, null, null, null], '기타')]), 2026);
    expect(rows[0].confidence).toBe('MIXED');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('비실리콘·0수량 제외', () => {
    const epdm = row('P4', [10, null, null, null, null], '확정'); epdm[1] = 'EPDM';
    expect(parseMonthlyForecast(base([epdm]), 2026).rows).toHaveLength(0);
    expect(parseMonthlyForecast(base([row('P5', [0, null, null, null, null], '확정')]), 2026).rows).toHaveLength(0);
  });
});
