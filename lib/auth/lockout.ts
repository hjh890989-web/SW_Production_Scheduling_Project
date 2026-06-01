/**
 * 계정 잠금 정책 (T1.5 — 5회 실패 / 5분 잠금, 사내 표준).
 * 순수 함수로 구현해 인증 흐름(auth.ts)에서 호출·테스트한다.
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 5;

/** 현재 잠금 상태 여부. */
export function isLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/**
 * 로그인 실패 1회 반영 결과 계산.
 * 누적 실패가 MAX 도달 시 lockedUntil 설정.
 */
export function registerFailure(
  currentFailed: number,
  now: Date = new Date(),
): { failedLogins: number; lockedUntil: Date | null } {
  const failedLogins = currentFailed + 1;
  if (failedLogins >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLogins,
      lockedUntil: new Date(now.getTime() + LOCK_DURATION_MINUTES * 60_000),
    };
  }
  return { failedLogins, lockedUntil: null };
}
