import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy, isPasswordChangeDue } from './password-policy';

describe('validatePasswordPolicy (T1.5 — 4자리 숫자 PIN)', () => {
  it('AC T1.5-1: 4자리 PIN("0000"·"1234") 통과', () => {
    expect(validatePasswordPolicy('0000').valid).toBe(true);
    expect(validatePasswordPolicy('1234').valid).toBe(true);
  });

  it('AC T1.5-F1: 4자리가 아니면 거부 + 사유', () => {
    const r = validatePasswordPolicy('123');
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('숫자가 아니거나 길이가 다르면 거부', () => {
    expect(validatePasswordPolicy('abcd').valid).toBe(false);
    expect(validatePasswordPolicy('12345').valid).toBe(false);
    expect(validatePasswordPolicy('Test1234!').valid).toBe(false);
  });
});

describe('isPasswordChangeDue (T1.5 — 90일)', () => {
  const now = new Date('2026-06-02T00:00:00Z');
  it('변경 이력 없으면 변경 필요', () => {
    expect(isPasswordChangeDue(null, now)).toBe(true);
  });
  it('91일 전 변경 → 필요', () => {
    expect(isPasswordChangeDue(new Date('2026-03-01T00:00:00Z'), now)).toBe(true);
  });
  it('10일 전 변경 → 불필요', () => {
    expect(isPasswordChangeDue(new Date('2026-05-23T00:00:00Z'), now)).toBe(false);
  });
});
