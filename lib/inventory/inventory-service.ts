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
 * T9.3 — 실적 적재 시 재고 갱신. 음수면 롤백 + 경고 로그 + Admin 알림.
 * delta>=0 생산: DB 원자 increment(SEC: read-modify-write 경합/lost update 제거).
 * delta<0 납품: 음수 가드를 위해 트랜잭션 내 검사(납품 경로는 현재 미가동).
 */
export async function applyInventoryChange(itemId: string, delta: number): Promise<InventoryUpdateResult> {
  try {
    let quantity: number;
    if (delta >= 0) {
      // 원자 증감 — 동시 호출에도 lost update 없음(증가는 항상 음수 불가).
      const inv = await prisma.inventory.upsert({
        where: { itemId },
        create: { itemId, quantity: delta },
        update: { quantity: { increment: delta } },
      });
      quantity = inv.quantity;
    } else {
      quantity = await prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.findUnique({ where: { itemId } });
        const current = inv?.quantity ?? 0;
        const { next, negative } = applyInventoryDelta(current, delta);
        if (negative) throw new NegativeInventoryError(itemId, next);
        await tx.inventory.upsert({
          where: { itemId },
          create: { itemId, quantity: next },
          update: { quantity: next },
        });
        return next;
      });
    }

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
