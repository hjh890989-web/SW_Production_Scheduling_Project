import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing (T1.1, CORE-3 bcryptjs 12 rounds)', () => {
  it('AC T1.1-2: 평문이 아닌 bcrypt 해시를 생성한다', async () => {
    const hash = await hashPassword('test1234');
    expect(hash).not.toBe('test1234');
    // bcrypt 12 rounds 식별자 ($2a$12$ 또는 $2b$12$)
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('올바른 비밀번호는 검증을 통과한다', async () => {
    const hash = await hashPassword('Test1234!');
    expect(await verifyPassword('Test1234!', hash)).toBe(true);
  });

  it('AC T1.1-F1: 잘못된 비밀번호는 검증에 실패한다', async () => {
    const hash = await hashPassword('Test1234!');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('같은 평문도 매번 다른 해시(salt)를 만든다', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });
});
