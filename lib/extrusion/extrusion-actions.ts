'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { generateAndSaveExtrusion } from '@/lib/extrusion/extrusion-service';

export interface ExtGenerateResult {
  ok: boolean;
  message: string;
  saved?: number;
  warnings?: number;
}

/** 압출 자동 스케줄 생성 (T6.2). extrusion:write + AuditLog. */
export async function generateExtrusionScheduleAction(weekStartISO: string): Promise<ExtGenerateResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'extrusion:write');
  } catch {
    return { ok: false, message: '생성 권한(extrusion:write)이 없습니다.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) return { ok: false, message: '주간 시작일 형식 오류.' };

  const result = await generateAndSaveExtrusion(weekStartISO);
  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'EXTRUSION_SCHEDULE_GENERATED',
    table: 'ExtrusionSchedule',
    key: weekStartISO,
    after: { saved: result.saved, warnings: result.warnings.length },
  });
  revalidatePath('/extrusion');
  return { ok: true, message: `자동 생성 완료: ${result.saved}건, 경고 ${result.warnings.length}건`, saved: result.saved, warnings: result.warnings.length };
}
