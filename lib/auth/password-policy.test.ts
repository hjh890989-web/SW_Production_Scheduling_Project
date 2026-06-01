import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy, isPasswordChangeDue } from './password-policy';

describe('validatePasswordPolicy (T1.5)', () => {
  it('AC T1.5-1: "Test1234!" 정책 통과', () => {
    expect(validatePasswordPolicy('Test1234!').valid).toBe(true);
  });

  it('AC T1.5-F1: "1234" 약한 비밀번호 거부 + 사유', () => {
    const r = validatePasswordPolicy('1234');
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('영문만/숫자만/특수만은 거부', () => {
    expect(validatePasswordPolicy('abcdefgh').valid).toBe(false);
    expect(validatePasswordPolicy('12345678').valid).toBe(false);
    expect(validatePasswordPolicy('!!!!!!!!').valid).toBe(false);
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
