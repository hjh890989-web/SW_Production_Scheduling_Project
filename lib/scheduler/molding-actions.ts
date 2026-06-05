'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { generateAndSave } from '@/lib/scheduler/molding-service';
import type { Algorithm } from '@/lib/scheduler/algorithm-toggle';

export interface GenerateResult {
  ok: boolean;
  message: string;
  saved?: number;
  warnings?: number;
}

/** 성형 자동 스케줄 생성 (T5.4 + T12.3 솔버 토글). molding:write + AuditLog. */
export async function generateMoldingScheduleAction(weekStartISO: string, algo: Algorithm = 'rule'): Promise<GenerateResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'molding:write');
  } catch {
    return { ok: false, message: '생성 권한(molding:write)이 없습니다.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) {
    return { ok: false, message: '주간 시작일 형식이 올바르지 않습니다.' };
  }

  const result = await generateAndSave(weekStartISO, algo);

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'MOLDING_SCHEDULE_GENERATED',
    table: 'MoldingSchedule',
    key: weekStartISO,
    after: { saved: result.saved, warnings: result.warnings.length, engine: result.engine },
  });

  revalidatePath('/molding');
  return {
    ok: true,
    message: `${result.engine === 'solver' ? '솔버' : '룰'} 생성 완료: ${result.saved}건 배치, 경고 ${result.warnings.length}건`,
    saved: result.saved,
    warnings: result.warnings.length,
  };
}
