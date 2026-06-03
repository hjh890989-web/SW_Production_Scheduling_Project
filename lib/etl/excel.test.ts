import { describe, it, expect } from 'vitest';
import { excelSerialToISO, isDateSerial, toNumber, toQuantity, MAX_QUANTITY } from './excel';

describe('excel helpers (T3.1)', () => {
  it('excelSerialToISO: 44197 → 2021-01-01 (앵커)', () => {
    expect(excelSerialToISO(44197)).toBe('2021-01-01');
  });

  it('연속 직렬값은 1일 간격', () => {
    expect(excelSerialToISO(46056)).not.toBe(excelSerialToISO(46055));
  });

  it('isDateSerial: 범위 판정', () => {
    expect(isDateSerial(46055)).toBe(true);
    expect(isDateSerial(100)).toBe(false);
    expect(isDateSerial('46055')).toBe(false);
  });

  it('toNumber: 숫자/숫자문자열/비숫자', () => {
    expect(toNumber(5)).toBe(5);
    expect(toNumber('5')).toBe(5);
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(null)).toBeNull();
  });

  it('toQuantity(SEC): 양의 정수만 통과, 소수/Infinity/0/음수/범위초과는 null', () => {
    expect(toQuantity(100)).toBe(100);
    expect(toQuantity('100')).toBe(100);
    expect(toQuantity(1.5)).toBeNull(); // 소수 → 배치 롤백 유발 차단
    expect(toQuantity(Infinity)).toBeNull();
    expect(toQuantity(0)).toBeNull();
    expect(toQuantity(-3)).toBeNull();
    expect(toQuantity(MAX_QUANTITY)).toBe(MAX_QUANTITY);
    expect(toQuantity(MAX_QUANTITY + 1)).toBeNull(); // Int4 overflow 차단
  });
});
