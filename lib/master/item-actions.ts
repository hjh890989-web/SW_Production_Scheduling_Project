'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { addAlias, normalizeProductCode } from '@/lib/etl/normalizer';

export interface ActionResult {
  ok: boolean;
  message: string;
  conflict?: boolean;
}

// 인라인 편집 허용 필드 화이트리스트 (타입 변환 기준)
const EDITABLE_FIELDS: Record<string, 'string' | 'number'> = {
  customerCode: 'string',
  hwasungCode: 'string',
  headPin: 'string',
  cutLength: 'number',
  extrusionSpeed: 'number',
  extrusionGroup: 'number',
};

/**
 * 품번 마스터 인라인 편집 (T2.5 — AC PM-3-1).
 * 권한 master:write + 낙관적 락(updatedAt) + AuditLog.
 */
export async function updateItemField(
  id: string,
  field: string,
  rawValue: string,
  expectedUpdatedAt: string,
): Promise<ActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }

  const kind = EDITABLE_FIELDS[field];
  if (!kind) return { ok: false, message: `편집할 수 없는 필드: ${field}` };

  const current = await prisma.item.findUnique({ where: { id } });
  if (!current) return { ok: false, message: '품번을 찾을 수 없습니다.' };

  // 낙관적 락 (AC PM-3-F1): 동시 편집 충돌 감지
  if (current.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { ok: false, conflict: true, message: '다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.' };
  }

  let value: string | number | null;
  if (kind === 'number') {
    const trimmed = rawValue.trim();
    value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && Number.isNaN(value)) {
      return { ok: false, message: '숫자를 입력하세요.' };
    }
  } else {
    value = rawValue.trim() === '' ? null : rawValue.trim();
  }

  const before = (current as Record<string, unknown>)[field];
  await prisma.item.update({ where: { id }, data: { [field]: value } });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ITEM_UPDATED',
    table: 'Item',
    key: current.productCode,
    before: { [field]: before },
    after: { [field]: value },
  });

  revalidatePath('/master/items');
  return { ok: true, message: '저장되었습니다.' };
}

/** 품번 별칭 추가 (T2.5 — AC T2.5-2). */
export async function addItemAlias(itemId: string, alias: string): Promise<ActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }
  const trimmed = alias.trim();
  if (trimmed.length < 2) return { ok: false, message: '별칭은 2자 이상이어야 합니다.' };

  await addAlias(itemId, trimmed);
  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ITEM_ALIAS_ADDED',
    table: 'ItemAlias',
    key: itemId,
    after: { alias: trimmed, normalized: normalizeProductCode(trimmed) },
  });
  revalidatePath('/master/items');
  return { ok: true, message: '별칭이 추가되었습니다.' };
}

/** 품번 별칭 삭제 (T2.5). */
export async function removeItemAlias(aliasId: string): Promise<ActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }
  const existing = await prisma.itemAlias.findUnique({ where: { id: aliasId } });
  if (!existing) return { ok: false, message: '별칭을 찾을 수 없습니다.' };

  await prisma.itemAlias.delete({ where: { id: aliasId } });
  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ITEM_ALIAS_REMOVED',
    table: 'ItemAlias',
    key: existing.itemId,
    before: { alias: existing.alias },
  });
  revalidatePath('/master/items');
  return { ok: true, message: '별칭이 삭제되었습니다.' };
}
