'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import type { ActionResult } from '@/lib/master/item-actions';

async function guard(): Promise<{ userId: string | null; role: string | null } | null> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return null;
  }
  return { userId: session?.user?.id ?? null, role: session?.user?.role ?? null };
}

/**
 * 장비 가동/비가동 토글 (T2.6 — AC T2.6-2). master:write + 낙관적 락 + AuditLog.
 * 비가동 전환의 "진행 중 N건" 경고는 클라이언트 확인 모달에서 처리(스케줄 모델은 Sprint 5).
 */
export async function toggleEquipmentActive(
  id: string,
  expectedUpdatedAt: string,
): Promise<ActionResult> {
  const actor = await guard();
  if (!actor) return { ok: false, message: '수정 권한(master:write)이 없습니다.' };

  const eq = await prisma.equipment.findUnique({ where: { id } });
  if (!eq) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  if (eq.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { ok: false, conflict: true, message: '다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.' };
  }

  const next = !eq.isActive;
  await prisma.equipment.update({ where: { id }, data: { isActive: next } });
  await logAudit({
    userId: actor.userId,
    userRole: actor.role,
    action: 'EQUIPMENT_TOGGLED',
    table: 'Equipment',
    key: eq.code,
    before: { isActive: eq.isActive },
    after: { isActive: next },
  });
  revalidatePath('/master/equipment');
  return { ok: true, message: next ? '가동으로 전환했습니다.' : '비가동으로 전환했습니다.' };
}

/** 장비 이름 수정 (T2.6). */
export async function updateEquipmentName(
  id: string,
  name: string,
  expectedUpdatedAt: string,
): Promise<ActionResult> {
  const actor = await guard();
  if (!actor) return { ok: false, message: '수정 권한(master:write)이 없습니다.' };

  const trimmed = name.trim();
  if (trimmed.length < 1) return { ok: false, message: '이름을 입력하세요.' };

  const eq = await prisma.equipment.findUnique({ where: { id } });
  if (!eq) return { ok: false, message: '장비를 찾을 수 없습니다.' };
  if (eq.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { ok: false, conflict: true, message: '다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.' };
  }

  await prisma.equipment.update({ where: { id }, data: { name: trimmed } });
  await logAudit({
    userId: actor.userId,
    userRole: actor.role,
    action: 'EQUIPMENT_UPDATED',
    table: 'Equipment',
    key: eq.code,
    before: { name: eq.name },
    after: { name: trimmed },
  });
  revalidatePath('/master/equipment');
  return { ok: true, message: '저장되었습니다.' };
}
