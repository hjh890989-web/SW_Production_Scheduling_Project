import { describe, it, expect } from 'vitest';
import { isSessionRevoked } from './session-revocation';

describe('isSessionRevoked (SEC)', () => {
  it('버전 일치 → 유효(무효 아님)', () => {
    expect(isSessionRevoked(0, 0)).toBe(false);
    expect(isSessionRevoked(3, 3)).toBe(false);
  });

  it('버전 불일치(비번 변경 후 구 토큰) → 무효', () => {
    expect(isSessionRevoked(0, 1)).toBe(true);
    expect(isSessionRevoked(2, 5)).toBe(true);
  });

  it('사용자 조회불가 → 무효', () => {
    expect(isSessionRevoked(0, null)).toBe(true);
    expect(isSessionRevoked(0, undefined)).toBe(true);
  });

  it('레거시 토큰(sv 없음) → 유예(무효 아님, 점진 롤아웃)', () => {
    expect(isSessionRevoked(undefined, 0)).toBe(false);
    expect(isSessionRevoked(undefined, 3)).toBe(false);
  });
});
