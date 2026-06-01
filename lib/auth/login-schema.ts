import { z } from 'zod';

/** 로그인 폼 검증 스키마 (T1.4 — 아이디 ≥ 3자, 비밀번호 ≥ 8자). */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: '아이디는 3자 이상이어야 합니다.' }),
  password: z
    .string()
    .min(8, { message: '비밀번호는 8자 이상이어야 합니다.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
