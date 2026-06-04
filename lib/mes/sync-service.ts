import cron from 'node-cron';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notify';
import { createMesClient } from './factory';
import { toProductionResultData } from './result-mapping';
import { applyInventoryDeltaTx } from '@/lib/inventory/inventory-service';
import { productionDelta } from '@/lib/inventory/delta';
import { shouldAlert, computeSince, pickDueRetries, POLL_CRON } from './sync-policy';
import { shouldRetry, nextRetryAt, type InstructionPayload } from './retry-policy';
import type { IMesClient } from './IMesClient';

export interface SyncOutcome {
  ok: boolean;
  synced: number;
  skipped: number;
  unmatched: number;
}

/** 마지막 동기화 시각(OperationParam)을 읽어 since 계산. */
async function lastSyncAt(): Promise<Date | null> {
  const p = await prisma.operationParam.findUnique({ where: { key: 'mes_last_sync_at' } });
  return p && !Number.isNaN(Date.parse(p.value)) ? new Date(p.value) : null;
}

/**
 * T9.5 — MES 실적 폴링 동기화. fetchResults → ProductionResult 멱등 적재 + 재고 갱신.
 */
export async function runMesSync(client: IMesClient = createMesClient(), now: Date = new Date()): Promise<SyncOutcome> {
  const since = computeSince(await lastSyncAt(), now);
  const records = await client.fetchResults(since);

  let synced = 0;
  let skipped = 0;
  let unmatched = 0;
  for (const record of records) {
    const item = await prisma.item.findUnique({ where: { productCode: record.productCode } });
    if (!item) {
      unmatched += 1;
      continue;
    }
    const exists = await prisma.productionResult.findUnique({ where: { externalId: record.externalId } });
    if (exists) {
      skipped += 1;
      continue;
    }
    try {
      // SEC: 실적 적재 + 재고 증가를 단일 트랜잭션으로 — 부분 실패 시 함께 롤백(영구 drift 방지)
      await prisma.$transaction(async (tx) => {
        await tx.productionResult.create({ data: toProductionResultData(record, item.id) });
        await applyInventoryDeltaTx(tx, item.id, productionDelta(record.quantity));
      });
    } catch (err) {
      if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
        skipped += 1; // 동시 중복(라우트와 cron 겹침) — 멱등 skip
        continue;
      }
      throw err;
    }
    synced += 1;
  }

  await prisma.operationParam.upsert({
    where: { key: 'mes_last_sync_at' },
    create: { key: 'mes_last_sync_at', value: now.toISOString() },
    update: { value: now.toISOString() },
  });
  await logAudit({ action: 'MES_SYNC_RAN', table: 'ProductionResult', after: { synced, skipped, unmatched } });
  return { ok: true, synced, skipped, unmatched };
}

/**
 * T9.5 — 재시도 큐 처리. 도래한 PENDING 항목을 재송신, 한도 초과 시 FAILED + 알림.
 */
export async function processRetryQueue(client: IMesClient = createMesClient(), now: Date = new Date()): Promise<number> {
  const pending = await prisma.mesRetryQueue.findMany({ where: { status: 'PENDING' } });
  const due = pickDueRetries(pending, now);
  let processed = 0;

  for (const item of due) {
    const result = await client.sendInstruction(item.payload as unknown as InstructionPayload);
    const attempts = item.attempts + 1;
    if (result.ok) {
      await prisma.mesRetryQueue.update({ where: { id: item.id }, data: { status: 'SENT', attempts } });
    } else if (shouldRetry(attempts, item.maxAttempts)) {
      await prisma.mesRetryQueue.update({
        where: { id: item.id },
        data: { attempts, lastError: result.error, nextRetryAt: nextRetryAt(now) },
      });
    } else {
      await prisma.mesRetryQueue.update({ where: { id: item.id }, data: { status: 'FAILED', attempts, lastError: result.error } });
      if (shouldAlert(attempts - item.maxAttempts + 1)) {
        await createNotification({
          type: 'MES_SEND_FAILED',
          title: 'MES 작업지시 송신 연속 실패',
          message: `작업지시 ${item.instructionId} 송신이 ${attempts}회 실패했습니다. 생산관리 확인이 필요합니다.`,
        });
      }
    }
    processed += 1;
  }
  return processed;
}

let registered = false;

/** 5분 주기 cron 등록 (서버 기동 시 호출). 빌드/테스트 시 자동 실행되지 않는다. */
export function registerMesCron(): cron.ScheduledTask {
  if (registered) throw new Error('MES cron already registered');
  registered = true;
  return cron.schedule(POLL_CRON, () => {
    void runMesSync();
    void processRetryQueue();
  });
}
