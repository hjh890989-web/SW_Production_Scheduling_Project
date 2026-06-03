'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { deriveSchedulerItem } from '@/lib/scheduler/slot-eligibility';
import { moldingSlotLists } from '@/lib/scheduler/molding-service';
import { evaluateMove, isStaleUpdate } from '@/lib/scheduler/move-rules';

export interface MoveTarget {
  equipmentCode: string;
  slot: string;
  date: string; // YYYY-MM-DD
  daynight: 'DAY' | 'NIGHT';
}

export interface MoveResult {
  ok: boolean;
  message: string;
  conflict?: boolean;
  ruleViolation?: boolean;
}

/**
 * 성형 셀 드래그 재배분 (T5.6 — J-MR-2 ⭐⭐).
 * 차단 없음(위치 X도 허용, ruleViolation 경고만), AUTO→MANUAL, 낙관적 락(updatedAt), AuditLog.
 */
export async function moveMoldingSchedule(
  scheduleId: string,
  target: MoveTarget,
  expectedUpdatedAt: string,
): Promise<MoveResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'molding:write');
  } catch {
    return { ok: false, message: '재배분 권한(molding:write)이 없습니다.' };
  }

  const sched = await prisma.moldingSchedule.findUnique({
    where: { id: scheduleId },
    include: { item: true, equipment: { select: { code: true } } },
  });
  if (!sched) return { ok: false, message: '대상 일정을 찾을 수 없습니다.' };

  // 낙관적 락 (AC T5.6-F1)
  if (isStaleUpdate(sched.updatedAt.toISOString(), expectedUpdatedAt)) {
    return { ok: false, conflict: true, message: '이 슬롯이 방금 변경되었습니다 — 새로고침 후 다시 시도하세요.' };
  }

  const targetEq = await prisma.equipment.findUnique({ where: { code: target.equipmentCode } });
  if (!targetEq) return { ok: false, message: '대상 가류기를 찾을 수 없습니다.' };

  // 룰 위반 판정(차단하지 않음, 경고만)
  const { lpSlots, icSlots } = await moldingSlotLists();
  const derived = deriveSchedulerItem(sched.item, lpSlots, icSlots);
  const { ruleViolation } = evaluateMove(target.slot, derived?.allowedSlots ?? []);

  const before = {
    equipmentCode: sched.equipment.code,
    slot: sched.slotPosition,
    date: sched.date.toISOString().slice(0, 10),
    daynight: sched.daynight,
    status: sched.status,
  };

  // 낙관적 락을 DB에서 원자적으로 강제(SEC: TOCTOU lost update 방지) — updatedAt 일치 행만 갱신
  const moved = await prisma.moldingSchedule.updateMany({
    where: { id: scheduleId, updatedAt: sched.updatedAt },
    data: {
      equipmentId: targetEq.id,
      slotPosition: target.slot,
      date: new Date(`${target.date}T00:00:00.000Z`),
      daynight: target.daynight,
      status: 'MANUAL', // AUTO → MANUAL (AC T5.6-1)
      ruleViolation,
    },
  });
  if (moved.count === 0) {
    return { ok: false, conflict: true, message: '이 슬롯이 방금 변경되었습니다 — 새로고침 후 다시 시도하세요.' };
  }

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'MOLDING_SCHEDULE_MOVED',
    table: 'MoldingSchedule',
    key: scheduleId,
    before,
    after: { ...target, status: 'MANUAL', rule_violation: ruleViolation },
    reason: ruleViolation ? 'rule_violation' : undefined,
  });

  revalidatePath('/molding');
  return {
    ok: true,
    ruleViolation,
    message: ruleViolation
      ? '배치되었습니다. ⚠️ 위치 제약(O/X) 위반 — 확인하세요.'
      : '배치되었습니다(수동).',
  };
}
