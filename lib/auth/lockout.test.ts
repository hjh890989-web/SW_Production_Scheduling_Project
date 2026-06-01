import { describe, it, expect } from 'vitest';
import { isLocked, registerFailure, MAX_FAILED_ATTEMPTS } from './lockout';

describe('lockout (T1.5 — 5회/5분)', () => {
  const now = new Date('2026-06-02T00:00:00Z');

  it('lockedUntil 미래면 잠금', () => {
    expect(isLocked(new Date(now.getTime() + 60_000), now)).toBe(true);
  });
  it('lockedUntil 과거/없음이면 해제 (AC T1.5-2 자동 해제)', () => {
    expect(isLocked(new Date(now.getTime() - 60_000), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });

  it('4회까지는 잠금 없음, 카운터만 증가', () => {
    const r = registerFailure(3, now);
    expect(r.failedLogins).toBe(4);
    expect(r.lockedUntil).toBeNull();
  });

  it('AC T1.4-F1/T1.5: 5회째 실패 → 5분 잠금', () => {
    const r = registerFailure(MAX_FAILED_ATTEMPTS - 1, now);
    expect(r.failedLogins).toBe(5);
    expect(r.lockedUntil).not.toBeNull();
    expect(r.lockedUntil!.getTime()).toBe(now.getTime() + 5 * 60_000);
  });
});
