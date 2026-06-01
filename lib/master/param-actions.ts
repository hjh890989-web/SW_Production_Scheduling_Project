'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { PARAM_BY_KEY, validateParamValue } from '@/lib/master/operation-params';

export interface ParamActionResult {
  ok: boolean;
  message: string;
  needsConfirm?: boolean;
}

/**
 * 운영 파라미터 수정 (T2.7 — R-9). master:write + 범위 검증 + AuditLog.
 * max 초과는 override=true(확인) 시에만 적용(AC T2.7-F1). min 미만은 항상 거부(AC T2.7-2).
 */
export async function updateOperationParam(
  key: string,
  rawValue: string,
  override = false,
): Promise<ParamActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }

  const def = PARAM_BY_KEY[key];
  if (!def) return { ok: false, message: `정의되지 않은 파라미터: ${key}` };

  const v = validateParamValue(def, rawValue);
  if (!v.ok) {
    if (v.needsConfirm && override) {
      // 사용자 확인됨 — max 초과 값 적용
    } else {
      return { ok: false, message: v.error ?? '유효하지 않은 값', needsConfirm: v.needsConfirm };
    }
  }

  const value = String(v.value);
  const before = await prisma.operationParam.findUnique({ where: { key } });
  await prisma.operationParam.upsert({
    where: { key },
    update: { value },
    create: { key, value, category: def.category, label: def.label },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'PARAM_UPDATED',
    table: 'OperationParam',
    key,
    before: { value: before?.value ?? null },
    after: { value },
  });

  revalidatePath('/master/parameters');
  return { ok: true, message: '저장되었습니다.' };
}
