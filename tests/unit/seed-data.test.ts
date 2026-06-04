import { describe, it, expect } from 'vitest';
import { SEED_USERS, assertSeedPolicy } from '../../prisma/seed-data';
import { ROLES } from '../../auth.config';

describe('시드 데이터 (T1.7)', () => {
  it('6 사용자 (Admin + 5 Role)', () => {
    expect(SEED_USERS).toHaveLength(6);
  });

  it('username 중복 없음', () => {
    const names = SEED_USERS.map((u) => u.username);
    expect(new Set(names).size).toBe(6);
  });

  it('각 Role이 정확히 1명씩, 모두 유효한 6 Role', () => {
    const roles = SEED_USERS.map((u) => u.role).sort();
    expect(roles).toEqual([...ROLES].sort());
  });

  it('AC T1.7-F1: 모든 시드 비밀번호가 정책 충족 (위반 시 throw)', () => {
    expect(() => assertSeedPolicy()).not.toThrow();
  });

  it('AC T1.7-F1: 정책 위반 비밀번호는 명확한 에러', () => {
    expect(() =>
      assertSeedPolicy([{ username: 'weak', password: '123', name: 'x', role: 'ADMIN', email: 'w@evs.local' }]),
    ).toThrow(/정책 위반/);
  });
});
