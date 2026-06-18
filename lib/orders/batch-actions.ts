'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export interface BatchDeleteResult {
  ok: boolean;
  message: string;
  deleted?: number;
}

/**
 * 업로드 배치 되돌리기 (hard delete). uploadBatchId 단위로 Order 행을 실제 삭제한다.
 * 잘못 올린 업로드 정리용. Order를 참조하는 모델이 없어 참조 무결성상 안전.
 * 삭제 내역은 AuditLog(ORDERS_BATCH_DELETED)에 보존한다.
 */
export async function deleteUploadBatch(batchId: string): Promise<BatchDeleteResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:upload');
  } catch {
    return { ok: false, message: '삭제 권한(order:upload)이 없습니다.' };
  }

  if (!batchId) return { ok: false, message: '배치 ID가 없습니다.' };

  const count = await prisma.order.count({ where: { uploadBatchId: batchId } });
  if (count === 0) return { ok: false, message: '해당 업로드를 찾을 수 없습니다(이미 삭제되었을 수 있습니다).' };

  await prisma.order.deleteMany({ where: { uploadBatchId: batchId } });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ORDERS_BATCH_DELETED',
    table: 'Order',
    key: batchId,
    after: { deleted: count },
  });

  revalidatePath('/orders');
  return { ok: true, message: `업로드를 되돌렸습니다: ${count}건 삭제`, deleted: count };
}
