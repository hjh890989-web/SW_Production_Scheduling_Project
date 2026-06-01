import bcrypt from 'bcryptjs';

/**
 * 비밀번호 해시·검증 (CORE-3: bcryptjs 12 rounds).
 * 12 rounds ≈ 100ms 이내 (성능 vs 보안 균형, T1.1 제약).
 */
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
