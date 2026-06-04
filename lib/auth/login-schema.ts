import { z } from 'zod';

/**
 * 로그인 검증 — 아이디는 개인 사번 8자리 숫자(admin 계정만 예외), 비밀번호는 4자리 숫자 PIN.
 * (참조: Check In EAS/FCB 동일 정책)
 */
export const ADMIN_LOGIN_ID = 'admin';
const SABUN_OR_ADMIN = /^(?:admin|\d{8})$/;

export const loginSchema = z.object({
  username: z.string().trim().regex(SABUN_OR_ADMIN, { message: '사번은 8자리 숫자입니다.' }),
  password: z.string().regex(/^\d{4}$/, { message: '비밀번호는 4자리 숫자(PIN)입니다.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
