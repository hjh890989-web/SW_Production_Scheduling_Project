'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { validatePasswordPolicy, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/password-policy';

export interface ActionResult {
  ok: boolean;
  message: string;
}

function clientIp(): string | null {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
}

/**
 * 본인 비밀번호 변경 (T1.5). 현재 비밀번호 확인 → 정책 검증 → 해시 갱신 → audit.
 * audit inline 기록은 T1.6에서 logAudit()로 일반화.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: '로그인이 필요합니다.' };
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return { ok: false, message: PASSWORD_POLICY_MESSAGE };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { ok: false, message: '사용자를 찾을 수 없습니다.' };
  }

  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    return { ok: false, message: '현재 비밀번호가 올바르지 않습니다.' };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        targetTable: 'User',
        targetKey: user.id,
        ipAddress: clientIp(),
      },
    });
  } catch (err) {
    console.error('[audit] PASSWORD_CHANGED 기록 실패:', err);
  }

  return { ok: true, message: '비밀번호가 변경되었습니다.' };
}
