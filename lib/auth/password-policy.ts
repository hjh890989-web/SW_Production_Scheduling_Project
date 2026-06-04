/**
 * 비밀번호 정책 — 4자리 숫자 PIN (개인 사번 로그인 체계; 참조: Check In EAS/FCB 동일 정책).
 * 약한 PIN이지만 5회 실패 잠금(lockout) + bcrypt 해싱으로 보완한다.
 */
export const PIN_LENGTH = 4;
export const PASSWORD_POLICY_MESSAGE = `비밀번호는 ${PIN_LENGTH}자리 숫자(PIN)여야 합니다.`;

/** 90일 변경 주기 (부록 G.1). */
export const PASSWORD_MAX_AGE_DAYS = 90;

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const PIN_RE = new RegExp(`^\\d{${PIN_LENGTH}}$`);

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (!PIN_RE.test(password)) errors.push(`${PIN_LENGTH}자리 숫자(PIN)여야 합니다.`);
  return { valid: errors.length === 0, errors };
}

/** 마지막 변경일 기준 90일 경과 여부 (대시보드 배너용). */
export function isPasswordChangeDue(
  passwordChangedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!passwordChangedAt) return true;
  const ageMs = now.getTime() - passwordChangedAt.getTime();
  return ageMs >= PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}
