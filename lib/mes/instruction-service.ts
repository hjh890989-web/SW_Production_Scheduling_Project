import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { createMesClient } from './factory';
import { nextRetryAt, type InstructionPayload } from './retry-policy';
import type { IMesClient } from './IMesClient';

export interface DispatchResult {
  ok: boolean;
  ackId?: string;
  queued?: boolean;
  error?: string;
}

/**
 * T9.4 — 작업지시 송신. 성공 시 ACK, timeout/실패 시 재시도 큐 적재(AC T9.4-F1).
 * client 주입 가능(테스트에서 실패 Mock 주입).
 */
export async function dispatchInstruction(
  payload: InstructionPayload,
  client: IMesClient = createMesClient(),
  now: Date = new Date(),
): Promise<DispatchResult> {
  const result = await client.sendInstruction(payload);

  if (result.ok) {
    await logAudit({
      action: 'MES_INSTRUCTION_SENT',
      table: 'MesRetryQueue',
      key: payload.instructionId,
      after: { ackId: result.ackId },
    });
    return { ok: true, ackId: result.ackId };
  }

  // 실패/timeout → 재시도 큐 적재 (5분 후)
  await prisma.mesRetryQueue.create({
    data: {
      instructionId: payload.instructionId,
      payload: payload as unknown as object,
      attempts: 0,
      status: 'PENDING',
      lastError: result.error,
      nextRetryAt: nextRetryAt(now),
    },
  });
  await logAudit({
    action: 'MES_INSTRUCTION_QUEUED',
    table: 'MesRetryQueue',
    key: payload.instructionId,
    reason: result.timeout ? 'timeout' : result.error,
  });
  return { ok: false, queued: true, error: result.error };
}
