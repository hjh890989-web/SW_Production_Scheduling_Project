/**
 * 비밀번호 정책 (T1.5 — 부록 G.1 인증 정책).
 * 8자 이상 + 영문 + 숫자 + 특수문자.
 */
export const PASSWORD_POLICY_MESSAGE =
  '비밀번호는 8자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.';

/** 90일 변경 주기 (부록 G.1). */
export const PASSWORD_MAX_AGE_DAYS = 90;

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < 8) errors.push('8자 이상이어야 합니다.');
  if (!/[A-Za-z]/.test(password)) errors.push('영문을 포함해야 합니다.');
  if (!/[0-9]/.test(password)) errors.push('숫자를 포함해야 합니다.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('특수문자를 포함해야 합니다.');
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
