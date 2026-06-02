'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { findItemByCodeOrAlias } from '@/lib/etl/normalizer';
import { changeSchema } from '@/lib/orders/change-schema';

export interface ChangeResult {
  ok: boolean;
  message: string;
  needsMaster?: boolean;
  orderId?: string;
  notificationId?: string;
}

const MANUAL_SOURCE = 'manual';

/**
 * 변동 입력 (T3.8 — F-2.4). order:write + 품번 검증 + Order(CHANGED) + AuditLog + Notification.
 * 미존재 품번은 마스터 등록 유도(AC T3.8-F1).
 */
export async function submitOrderChange(input: unknown): Promise<ChangeResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:write');
  } catch {
    return { ok: false, message: '변경 권한(order:write)이 없습니다.' };
  }

  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' };
  }
  const { productCode, changeType, newValue, reason } = parsed.data;

  const item = await findItemByCodeOrAlias(productCode);
  if (!item) {
    return { ok: false, needsMaster: true, message: `미등록 품번(${productCode}) — 마스터 등록이 필요합니다.` };
  }

  const quantity = changeType === '수량' || changeType === '추가' ? Number(newValue) : 0;
  if ((changeType === '수량' || changeType === '추가') && (Number.isNaN(quantity) || quantity < 0)) {
    return { ok: false, message: '수량은 0 이상의 숫자여야 합니다.' };
  }
  const deliveryDate =
    changeType === '일자' && /^\d{4}-\d{2}-\d{2}$/.test(newValue)
      ? new Date(`${newValue}T00:00:00.000Z`)
      : new Date();

  const order = await prisma.order.create({
    data: {
      itemId: item.id,
      rawProductCode: productCode,
      deliveryDate,
      quantity,
      orderType: 'OEM',
      sourceType: MANUAL_SOURCE,
      confidence: 'CONFIRMED',
      status: changeType === '취소' ? 'CANCELLED' : 'CHANGED',
      reason: `${changeType}:${newValue} / ${reason}`,
    },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ORDER_CHANGED',
    table: 'Order',
    key: order.id,
    after: { changeType, newValue, status: order.status },
    reason,
  });

  // 생산관리(김민수) 대상 알림
  const target = await prisma.user.findUnique({ where: { username: 'kimms' } }).catch(() => null);
  const notification = await prisma.notification.create({
    data: {
      type: 'ORDER_CHANGED',
      message: `수주 변동: ${productCode} ${changeType} → ${newValue}`,
      payload: { orderId: order.id, changeType, newValue },
      targetUserId: target?.id ?? null,
    },
  });

  revalidatePath('/orders');
  return { ok: true, message: '변동이 저장되었습니다.', orderId: order.id, notificationId: notification.id };
}

/**
 * 5초 grace period 내 취소 (T3.8 — AC T3.8-2). 알림 취소 + audit cancelled_within_grace.
 */
export async function cancelOrderChange(notificationId: string, orderId: string): Promise<ChangeResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:write');
  } catch {
    return { ok: false, message: '권한이 없습니다.' };
  }

  await prisma.notification.update({ where: { id: notificationId }, data: { cancelled: true } }).catch(() => null);
  await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }).catch(() => null);

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ORDER_CHANGE_CANCELLED',
    table: 'Order',
    key: orderId,
    after: { cancelled_within_grace: true },
  });
  revalidatePath('/orders');
  return { ok: true, message: '변동을 취소했습니다(grace period).' };
}
