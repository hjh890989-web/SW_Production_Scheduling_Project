import { z } from 'zod';

/**
 * T9.4 작업지시 송신 재시도 정책 — 순수 함수. timeout/실패 시 5분 후 재시도(AC T9.4-F1).
 */

export const RETRY_BASE_MS = 5 * 60 * 1000; // 5분 (명세 고정 간격)
export const MAX_ATTEMPTS = 5;

/** 시도 횟수가 한도 미만이면 재시도. */
export function shouldRetry(attempts: number, maxAttempts: number = MAX_ATTEMPTS): boolean {
  return attempts < maxAttempts;
}

/** 다음 재시도 시각(현재 + 5분 고정). */
export function nextRetryAt(now: Date, baseMs: number = RETRY_BASE_MS): Date {
  return new Date(now.getTime() + baseMs);
}

/** 재시도 큐 항목의 도래 여부(nextRetryAt ≤ now). */
export function isDue(nextRetry: Date, now: Date): boolean {
  return nextRetry.getTime() <= now.getTime();
}

/** YYYY-MM-DD 형식 + 실제 달력상 유효 일자(SEC: 2026-13-40 등 거부). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, '유효한 달력 일자가 아닙니다');

export const instructionSchema = z.object({
  instructionId: z.string().min(1).max(200),
  weekStart: isoDate,
  process: z.enum(['MOLDING', 'EXTRUSION']),
  lines: z
    .array(
      z.object({
        equipmentCode: z.string().min(1).max(100),
        productCode: z.string().min(1).max(100),
        quantity: z.number().int().nonnegative().max(2_147_483_647),
      }),
    )
    .max(1000),
});

export type InstructionPayload = z.infer<typeof instructionSchema>;
