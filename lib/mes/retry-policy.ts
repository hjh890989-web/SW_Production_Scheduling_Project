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

export const instructionSchema = z.object({
  instructionId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  process: z.enum(['MOLDING', 'EXTRUSION']),
  lines: z.array(
    z.object({
      equipmentCode: z.string().min(1),
      productCode: z.string().min(1),
      quantity: z.number().int().nonnegative(),
    }),
  ),
});

export type InstructionPayload = z.infer<typeof instructionSchema>;
