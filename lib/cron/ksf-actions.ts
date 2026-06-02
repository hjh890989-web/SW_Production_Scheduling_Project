'use server';

import { auth } from '@/auth';
import { assertRole } from '@/lib/auth/assert';
import { logAudit } from '@/lib/audit';
import { runKsfSnapshot } from '@/lib/cron/ksf-snapshot';

export interface KsfTriggerResult {
  ok: boolean;
  message: string;
}

/** KSF 스냅샷 수동 트리거 (T4.6 E2E·운영 점검용). ADMIN 전용. */
export async function triggerKsfSnapshot(): Promise<KsfTriggerResult> {
  const session = await auth();
  try {
    assertRole(session, ['ADMIN']);
  } catch {
    return { ok: false, message: '관리자 권한이 필요합니다.' };
  }

  const result = await runKsfSnapshot(new Date());
  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'KSF_SNAPSHOT_TRIGGERED',
    table: 'KsfDailySnapshot',
    after: { ok: result.ok, attempts: result.attempts },
  });

  return result.ok
    ? { ok: true, message: '오늘자 KSF 스냅샷을 적재했습니다.' }
    : { ok: false, message: 'KSF 스냅샷 적재 실패(재시도 3회 초과).' };
}
