import { describe, it, expect } from 'vitest';
import { normalizeProductCode } from './normalizer';

describe('normalizeProductCode (T2.9, CORE-2)', () => {
  it('공백 제거 + 소문자', () => {
    expect(normalizeProductCode('A 672 203 17 02')).toBe('a6722031702');
  });

  it('하이픈 제거', () => {
    expect(normalizeProductCode('25474-2S010')).toBe('254742s010');
  });

  it('슬래시 등 복합 구분자 제거', () => {
    expect(normalizeProductCode('25474-2S000/2S010')).toBe('254742s0002s010');
  });

  it('같은 품번의 다른 표기는 같은 키로 수렴', () => {
    expect(normalizeProductCode('RH-A123')).toBe(normalizeProductCode('rh a 123'));
    expect(normalizeProductCode('RH A123')).toBe('rha123');
  });

  it('앞뒤 공백·탭 제거', () => {
    expect(normalizeProductCode('  AB-12  ')).toBe('ab12');
  });

  it('빈 문자열/기호만 → 빈 문자열', () => {
    expect(normalizeProductCode('')).toBe('');
    expect(normalizeProductCode('---///')).toBe('');
  });

  it('이미 정규화된 입력은 멱등', () => {
    const once = normalizeProductCode('A 672 203');
    expect(normalizeProductCode(once)).toBe(once);
  });

  it('숫자만/영문만 케이스', () => {
    expect(normalizeProductCode('12345')).toBe('12345');
    expect(normalizeProductCode('ABCDE')).toBe('abcde');
  });

  it('대소문자 혼합 통일', () => {
    expect(normalizeProductCode('aBcD-1234')).toBe('abcd1234');
  });

  it('한글·특수문자도 비영숫자로 제거', () => {
    expect(normalizeProductCode('호스A-12')).toBe('a12');
  });
});
