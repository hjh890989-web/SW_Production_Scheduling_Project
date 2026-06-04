import { describe, it, expect } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema (T1.4 — 사번 8자리 / PIN 4자리)', () => {
  it('정상: 8자리 사번 + 4자리 PIN 통과', () => {
    expect(loginSchema.safeParse({ username: '20230401', password: '0000' }).success).toBe(true);
  });

  it('admin 계정은 예외로 허용', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: '1234' }).success).toBe(true);
  });

  it('사번이 8자리 숫자가 아니면 거부', () => {
    expect(loginSchema.safeParse({ username: '1234', password: '0000' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'abcdefgh', password: '0000' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: '123456789', password: '0000' }).success).toBe(false);
  });

  it('PIN이 4자리 숫자가 아니면 거부', () => {
    expect(loginSchema.safeParse({ username: '20230401', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: '20230401', password: '12345' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: '20230401', password: 'abcd' }).success).toBe(false);
  });

  it('빈 입력 거부', () => {
    expect(loginSchema.safeParse({ username: '', password: '' }).success).toBe(false);
  });
});
