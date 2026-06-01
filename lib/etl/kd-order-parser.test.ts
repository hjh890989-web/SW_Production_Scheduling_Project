import { describe, it, expect } from 'vitest';
import { parseKdOrder } from './kd-order-parser';
import { excelSerialToISO } from './excel';

// [오더번호, 발주번호, 품번, _, E열변경일, _, 수량, 원본일, _, _, K열원본일]
function row(code: string, changed: number | null, qty: number | null, original: number | null) {
  const r: (string | number | null)[] = new Array(11).fill(null);
  r[0] = 'CF2LEB0001';
  r[1] = 'HLPKP0001W';
  r[2] = code;
  r[4] = changed;
  r[6] = qty;
  r[10] = original;
  return r;
}

describe('parseKdOrder (T3.2)', () => {
  it('AC T3.2-1: 데이터 행만 적재, sourceType=kd/orderType=KD', () => {
    const m = [
      ['오더번호', '발주번호', '품번', null, null, null, '수량'], // 헤더(수량 문자열 → 제외)
      row('57220-4F250', 46056, 30, 46052),
    ];
    const { rows } = parseKdOrder(m);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rawProductCode: '57220-4F250', quantity: 30, sourceType: 'kd', orderType: 'KD' });
  });

  it('AC T3.2-2: E열(변경) 우선', () => {
    const { rows } = parseKdOrder([row('P1', 46056, 10, 46052)]);
    expect(rows[0].deliveryDate).toBe(excelSerialToISO(46056));
  });

  it('E열 없으면 K열(원본) 사용', () => {
    const { rows } = parseKdOrder([row('P2', null, 10, 46052)]);
    expect(rows[0].deliveryDate).toBe(excelSerialToISO(46052));
  });

  it('수량 0/일자 없음 행 제외', () => {
    expect(parseKdOrder([row('P3', 46056, 0, 46052)]).rows).toHaveLength(0);
    expect(parseKdOrder([row('P4', null, 10, null)]).rows).toHaveLength(0);
  });

  it('AC T3.2-F1 보강: 데이터 0건이면 에러', () => {
    const { rows, errors } = parseKdOrder([['헤더만']]);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
