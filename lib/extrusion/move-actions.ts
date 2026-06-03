'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { isStaleUpdate } from '@/lib/scheduler/move-rules';
import { evaluateExtMove } from '@/lib/extrusion/move-rules';

export interface ExtMoveTarget {
  extruderCode: string;
  shift: string;
  date: string; // YYYY-MM-DD
}

export interface ExtMoveResult {
  ok: boolean;
  message: string;
  conflict?: boolean;
  ruleViolation?: boolean;
}

/** 압출 셀 드래그 재배분 (T6.6 — AC ER-2-1·2). 차단 없음, AUTO→MANUAL, 낙관적 락, audit. */
export async function moveExtrusionSchedule(
  scheduleId: string,
  target: ExtMoveTarget,
  expectedUpdatedAt: string,
): Promise<ExtMoveResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'extrusion:write');
  } catch {
    return { ok: false, message: '재배분 권한(extrusion:write)이 없습니다.' };
  }

  const sched = await prisma.extrusionSchedule.findUnique({
    where: { id: scheduleId },
    include: { item: { select: { extruderFord: true, extruderNew: true } }, extruder: { select: { code: true } } },
  });
  if (!sched) return { ok: false, message: '대상 일정을 찾을 수 없습니다.' };
  if (isStaleUpdate(sched.updatedAt.toISOString(), expectedUpdatedAt)) {
    return { ok: false, conflict: true, message: '이 셀이 방금 변경되었습니다 — 새로고침 후 다시 시도하세요.' };
  }

  const targetEq = await prisma.equipment.findUnique({ where: { code: target.extruderCode } });
  if (!targetEq) return { ok: false, message: '대상 압출기를 찾을 수 없습니다.' };

  const { ruleViolation } = evaluateExtMove(target.extruderCode, sched.item);
  const before = { extruderCode: sched.extruder.code, shift: sched.shift, date: sched.date.toISOString().slice(0, 10), status: sched.status };

  // 낙관적 락 DB 원자 강제(SEC: TOCTOU lost update 방지)
  const moved = await prisma.extrusionSchedule.updateMany({
    where: { id: scheduleId, updatedAt: sched.updatedAt },
    data: { extruderId: targetEq.id, shift: target.shift, date: new Date(`${target.date}T00:00:00.000Z`), status: 'MANUAL', ruleViolation },
  });
  if (moved.count === 0) {
    return { ok: false, conflict: true, message: '이 셀이 방금 변경되었습니다 — 새로고침 후 다시 시도하세요.' };
  }

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'EXTRUSION_SCHEDULE_MOVED',
    table: 'ExtrusionSchedule',
    key: scheduleId,
    before,
    after: { ...target, status: 'MANUAL', rule_violation: ruleViolation },
    reason: ruleViolation ? 'rule_violation' : undefined,
  });

  revalidatePath('/extrusion');
  return { ok: true, ruleViolation, message: ruleViolation ? '배치되었습니다. ⚠️ 압출기 비호환 — 확인하세요.' : '배치되었습니다(수동).' };
}

/** 주간 압출 스케줄 확정 (T6.6 — AC ER-2-3). MANUAL/AUTO → CONFIRMED. extrusion:confirm(SEC: 확정 권한 분리). */
export async function confirmExtrusionSchedule(weekStartISO: string): Promise<ExtMoveResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'extrusion:confirm');
  } catch {
    return { ok: false, message: '확정 권한(extrusion:confirm)이 없습니다.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) return { ok: false, message: '주간 시작일 형식 오류.' };

  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const res = await prisma.extrusionSchedule.updateMany({
    where: { weekStart, status: { in: ['AUTO', 'MANUAL'] } },
    data: { status: 'CONFIRMED' },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'EXTRUSION_SCHEDULE_CONFIRMED',
    table: 'ExtrusionSchedule',
    key: weekStartISO,
    after: { confirmed: res.count },
  });

  revalidatePath('/extrusion');
  return { ok: true, message: `${res.count}건을 확정했습니다.` };
}
