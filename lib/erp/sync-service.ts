import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { notify } from '@/lib/notification-actions';
import { createErpClient } from './factory';
import { toCreateData, computeItemChanges, summarize, type SyncSummary } from './sync-mapping';
import type { IErpClient } from './IErpClient';

export interface ErpSyncResult {
  ok: boolean;
  summary?: SyncSummary;
  error?: string;
}

/**
 * T10.2 — ERP 품번 마스터를 Item으로 동기화(변경분만 upsert). 성공 시 erp_sync_completed audit.
 * ERP 다운(fetch throw) 시 실패 audit + Admin 알림(AC T10.2-F1) → 다음 cron 재시도.
 * client 주입 가능(테스트에서 정상/다운 Mock 주입).
 */
export async function runErpSync(client: IErpClient = createErpClient()): Promise<ErpSyncResult> {
  let records;
  try {
    records = await client.fetchItems();
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown';
    await logAudit({ action: 'erp_sync_failed', table: 'Item', reason: error });
    await notify({
      type: 'ERP_SYNC_FAILED',
      title: '영림원 ERP 동기화 실패',
      message: `ERP 동기화에 실패했습니다(${error}). 다음 동기화에서 재시도합니다.`,
    });
    return { ok: false, error };
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const record of records) {
    const existing = await prisma.item.findUnique({
      where: { productCode: record.productCode },
      select: { customerCode: true, hwasungCode: true, material: true },
    });
    if (!existing) {
      await prisma.item.create({ data: toCreateData(record) });
      created += 1;
      continue;
    }
    const changes = computeItemChanges(existing, record);
    if (changes) {
      await prisma.item.update({ where: { productCode: record.productCode }, data: changes });
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  const summary = summarize({ created, updated, unchanged });
  await logAudit({ action: 'erp_sync_completed', table: 'Item', after: summary });
  return { ok: true, summary };
}
