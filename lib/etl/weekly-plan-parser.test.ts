import { describe, it, expect } from 'vitest';
import { parseWeeklyPlan } from './weekly-plan-parser';
import { excelSerialToISO } from './excel';

// 실 파일 레이아웃을 본뜬 합성 matrix (r0 무시, r1 헤더, r2 일자, r3+ 데이터)
const HEADER = ['구분', '납품 유형', '종류', '차종', '사양', '후가공', '납품처', '고객사 품번', '생산 품번', '화승품번', '계획'];
function matrixWith(dataRows: (string | number | null)[][]) {
  return [
    [null, null, null, null, null, null, null, null, null, null, 16500, 15916],
    HEADER,
    [null, null, null, null, null, null, null, null, null, null, 46055, 46056], // 일자 직렬
    ...dataRows,
  ];
}

describe('parseWeeklyPlan (T3.1)', () => {
  it('AC T3.1-1: Wide→Long unpivot, 모든 row sourceType=weekly_plan', () => {
    const m = matrixWith([
      ['실리콘', 'OEM', 'HOSE', '', '', '', '', 'C1', '25490-03HA0', 'G1', 100, 200],
    ]);
    const { rows, errors } = parseWeeklyPlan(m);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.sourceType === 'weekly_plan' && r.confidence === 'CONFIRMED')).toBe(true);
    expect(rows[0]).toMatchObject({ rawProductCode: '25490-03HA0', quantity: 100, deliveryDate: excelSerialToISO(46055) });
  });

  it('AC T3.1-2: 0/빈 수량 row는 제외', () => {
    const m = matrixWith([['실리콘', 'OEM', 'H', '', '', '', '', '', 'P1', '', 0, 50]]);
    const { rows } = parseWeeklyPlan(m);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(50);
  });

  it('비실리콘(구분≠실리콘) row 제외', () => {
    const m = matrixWith([['EPDM', 'OEM', 'H', '', '', '', '', '', 'P2', '', 10, 20]]);
    expect(parseWeeklyPlan(m).rows).toHaveLength(0);
  });

  it('KD 납품유형은 orderType=KD', () => {
    const m = matrixWith([['실리콘', 'KD', 'H', '', '', '', '', '', 'P3', '', 5, 0]]);
    expect(parseWeeklyPlan(m).rows[0].orderType).toBe('KD');
  });

  it('AC T3.1-F1: 일자 행 없음(양식 깨짐) → 에러, 적재 0', () => {
    const broken = [HEADER, HEADER, ['실리콘', 'OEM', 'H', '', '', '', '', '', 'P4', '', 1, 2], ['x']];
    const { rows, errors } = parseWeeklyPlan(broken);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
