'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { findItemByCodeOrAlias } from '@/lib/etl/normalizer';
import { simulateImpact, type ScheduleRef, type ImpactEntry } from '@/lib/scheduler/impact-simulator';

export interface ImpactPanelResult {
  ok: boolean;
  notFound?: boolean;
  message?: string;
  affected?: ImpactEntry[];
  counts?: { critical: number; warning: number; auto: number; unknown: number };
  total?: number;
  degraded?: boolean;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 변동 입력 영향 시뮬 (T7.2 — AC PM-1-1). order:read + dryRun(DB 변경 X).
 * 같은 품번의 성형·압출 스케줄을 좌표와 함께 영향 대상으로 반환.
 */
export async function simulateOrderChangeImpact(productCode: string, changeType = '수량'): Promise<ImpactPanelResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:read');
  } catch {
    return { ok: false, message: '조회 권한(order:read)이 없습니다.' };
  }
  if (!productCode || productCode.trim().length < 3) return { ok: false, message: '품번을 입력하세요.' };

  const item = await findItemByCodeOrAlias(productCode.trim());
  if (!item) return { ok: false, notFound: true, message: `미등록 품번(${productCode})` };

  const [molding, extrusion] = await Promise.all([
    prisma.moldingSchedule.findMany({ where: { itemId: item.id }, include: { equipment: { select: { code: true } } } }),
    prisma.extrusionSchedule.findMany({ where: { itemId: item.id }, include: { extruder: { select: { code: true } } } }),
  ]);

  const refs: ScheduleRef[] = [
    ...molding.map((m) => ({
      process: 'MOLDING' as const,
      scheduleId: m.id,
      itemId: m.itemId,
      productCode: item.productCode,
      date: iso(m.date),
      status: m.status,
      rowKey: `${m.equipment.code}_${m.slotPosition}`,
      colKey: `${iso(m.date)}_${m.daynight}`,
    })),
    ...extrusion.map((e) => ({
      process: 'EXTRUSION' as const,
      scheduleId: e.id,
      itemId: e.itemId,
      productCode: item.productCode,
      date: iso(e.date),
      status: e.status,
      rowKey: `${e.extruder.code}_${e.shift}`,
      colKey: iso(e.date),
    })),
  ];

  const result = simulateImpact({ itemId: item.id, productCode: item.productCode, changeType }, refs, { degraded: false });
  return { ok: true, affected: result.affected, counts: result.counts, total: result.total, degraded: result.degraded };
}
