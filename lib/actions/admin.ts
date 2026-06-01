'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assertRole } from '@/lib/auth/assert';
import { logAudit } from '@/lib/audit';
import type { ActionResult } from '@/lib/actions/password';

/**
 * Admin 강제 잠금 해제 (T1.5). ADMIN 역할 전용.
 * 대상 사용자의 failedLogins·lockedUntil 리셋 + audit.
 */
export async function unlockAccount(userId: string): Promise<ActionResult> {
  const session = await auth();
  try {
    assertRole(session, ['ADMIN']);
  } catch {
    return { ok: false, message: '관리자 권한이 필요합니다.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ACCOUNT_UNLOCKED',
    table: 'User',
    key: userId,
  });

  return { ok: true, message: '계정 잠금을 해제했습니다.' };
}
