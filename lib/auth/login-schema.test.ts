import { describe, it, expect } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema (T1.4)', () => {
  it('AC T1.4-1: 정상 입력 통과', () => {
    const r = loginSchema.safeParse({ username: 'kimms', password: 'Test1234!' });
    expect(r.success).toBe(true);
  });

  it('AC T1.4-2: 짧은 아이디(<3자) 거부', () => {
    const r = loginSchema.safeParse({ username: 'ab', password: 'Test1234!' });
    expect(r.success).toBe(false);
  });

  it('AC T1.4-2: 짧은 비밀번호(<8자) 거부', () => {
    const r = loginSchema.safeParse({ username: 'kimms', password: 'short' });
    expect(r.success).toBe(false);
  });

  it('빈 입력 거부', () => {
    expect(loginSchema.safeParse({ username: '', password: '' }).success).toBe(false);
  });
});
