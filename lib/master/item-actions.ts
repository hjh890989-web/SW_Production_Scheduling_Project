'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { addAlias, normalizeProductCode } from '@/lib/etl/normalizer';
import { normalizeMaterial } from '@/lib/material/material';

export interface ActionResult {
  ok: boolean;
  message: string;
  conflict?: boolean;
}

export interface CreateItemInput {
  productCode: string;
  material: string;
  customerCode?: string;
  hwasungCode?: string;
}

/**
 * 신규 품번 등록 (W-6.1). 미매칭 수주 품번을 마스터에 추가하는 경로.
 * 권한 master:write + productCode 중복 검사 + AuditLog.
 * 압출·성형 제약은 등록 후 인라인 편집으로 채운다.
 */
export async function createItem(input: CreateItemInput): Promise<ActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '등록 권한(master:write)이 없습니다.' };
  }

  const productCode = input.productCode.trim();
  if (productCode.length < 3) return { ok: false, message: '품번을 3자 이상 입력하세요.' };

  const existing = await prisma.item.findUnique({ where: { productCode } });
  if (existing) return { ok: false, conflict: true, message: `이미 등록된 품번입니다: ${productCode}` };

  const material = normalizeMaterial(input.material);
  await prisma.item.create({
    data: {
      productCode,
      material,
      customerCode: input.customerCode?.trim() || null,
      hwasungCode: input.hwasungCode?.trim() || null,
    },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ITEM_CREATED',
    table: 'Item',
    key: productCode,
    after: { productCode, material },
  });

  revalidatePath('/master/items');
  return { ok: true, message: `품번이 등록되었습니다: ${productCode} (${material})` };
}

// 인라인 편집 허용 필드 화이트리스트 (타입 변환 기준)
const EDITABLE_FIELDS: Record<string, 'string' | 'number' | 'boolean'> = {
  customerCode: 'string',
  hwasungCode: 'string',
  headPin: 'string',
  cutLength: 'number',
  extrusionSpeed: 'number',
  extrusionGroup: 'number',
  extruderFord: 'boolean',
  extruderNew: 'boolean',
  lpMoldsPerAngle: 'number',
  icMoldsPerAngle: 'number',
  lpPosTop: 'boolean',
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

  let value: string | number | boolean | null;
  if (kind === 'number') {
    const trimmed = rawValue.trim();
    value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && Number.isNaN(value)) {
      return { ok: false, message: '숫자를 입력하세요.' };
    }
    // E그룹은 압출 다이 분류(1~8). 범위 밖 값은 스케줄링을 망가뜨리므로 거부.
    if (field === 'extrusionGroup' && value !== null && (!Number.isInteger(value) || value < 1 || value > 8)) {
      return { ok: false, message: 'E그룹은 1~8 사이의 정수여야 합니다.' };
    }
    // 앵글당 금형수는 회전수 계산 분모 — 음수·소수면 스케줄 배치가 깨진다.
    if ((field === 'lpMoldsPerAngle' || field === 'icMoldsPerAngle') && value !== null && (!Number.isInteger(value) || value < 0)) {
      return { ok: false, message: '앵글당 금형수는 0 이상의 정수여야 합니다.' };
    }
  } else if (kind === 'boolean') {
    value = rawValue === 'true';
  } else {
    value = rawValue.trim() === '' ? null : rawValue.trim();
  }

  const before = (current as Record<string, unknown>)[field];
  // 낙관적 락 DB 원자 강제(SEC: TOCTOU lost update 방지)
  const updated = await prisma.item.updateMany({ where: { id, updatedAt: current.updatedAt }, data: { [field]: value } });
  if (updated.count === 0) {
    return { ok: false, conflict: true, message: '다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요.' };
  }

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
