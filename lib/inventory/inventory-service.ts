import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notify';
import { applyInventoryDelta } from './delta';

/** 음수 재고로 적용 시 던지는 에러 → 트랜잭션 롤백 유도(AC T9.3-F1). */
export class NegativeInventoryError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly attempted: number,
  ) {
    super(`negative inventory for ${itemId}: ${attempted}`);
    this.name = 'NegativeInventoryError';
  }
}

export interface InventoryUpdateResult {
  ok: boolean;
  itemId: string;
  quantity?: number;
  negative?: boolean;
}

/**
 * 주어진 트랜잭션(tx) 위에서 재고만 변경(audit/notify 없음). 호출자가 같은 tx에 ProductionResult
 * 등 다른 쓰기를 묶어 **부분 실패 시 함께 롤백**시키기 위함(SEC: create+재고 비원자 drift 제거).
 * delta>=0 원자 increment, delta<0 음수 가드(throw NegativeInventoryError). 갱신된 수량 반환.
 */
export async function applyInventoryDeltaTx(
  tx: Prisma.TransactionClient,
  itemId: string,
  delta: number,
): Promise<number> {
  if (delta >= 0) {
    // 원자 증감 — 동시 호출에도 lost update 없음(증가는 항상 음수 불가).
    const inv = await tx.inventory.upsert({
      where: { itemId },
      create: { itemId, quantity: delta },
      update: { quantity: { increment: delta } },
    });
    return inv.quantity;
  }
  const inv = await tx.inventory.findUnique({ where: { itemId } });
  const current = inv?.quantity ?? 0;
  const { next, negative } = applyInventoryDelta(current, delta);
  if (negative) throw new NegativeInventoryError(itemId, next);
  await tx.inventory.upsert({ where: { itemId }, create: { itemId, quantity: next }, update: { quantity: next } });
  return next;
}

/**
 * T9.3 — 실적 적재 시 재고 갱신(단독 호출용: 자체 트랜잭션 + audit/notify). 음수면 롤백 + Admin 알림.
 * create와 한 묶음으로 묶으려면 호출자가 직접 $transaction에서 applyInventoryDeltaTx를 쓴다.
 */
export async function applyInventoryChange(itemId: string, delta: number): Promise<InventoryUpdateResult> {
  try {
    const quantity = await prisma.$transaction((tx) => applyInventoryDeltaTx(tx, itemId, delta));

    await logAudit({
      action: 'INVENTORY_UPDATED',
      table: 'Inventory',
      key: itemId,
      after: { quantity, delta },
    });
    return { ok: true, itemId, quantity };
  } catch (err) {
    if (err instanceof NegativeInventoryError) {
      console.warn(`[Inventory] 음수 재고 방지 롤백: item=${itemId} attempted=${err.attempted}`);
      await createNotification({
        type: 'INVENTORY_NEGATIVE',
        title: '재고 불일치(음수) 감지',
        message: `품번 ${itemId} 재고가 음수(${err.attempted})가 되어 갱신을 롤백했습니다. 확인이 필요합니다.`,
      });
      await logAudit({
        action: 'INVENTORY_NEGATIVE_ROLLBACK',
        table: 'Inventory',
        key: itemId,
        reason: `attempted ${err.attempted}`,
      });
      return { ok: false, itemId, negative: true };
    }
    throw err;
  }
}
