'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { feedbackSchema } from '@/lib/feedback/feedback-schema';

export interface FeedbackResult {
  ok: boolean;
  message: string;
}

/**
 * 베타 사용성 피드백 제출 (T5.12). 신규 모델 없이 Notification(type=BETA_FEEDBACK)으로 수집.
 * 관리자(admin) 대상 알림 + audit.
 */
export async function submitFeedback(input: unknown): Promise<FeedbackResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: '로그인이 필요합니다.' };

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인하세요.' };
  }
  const { rating, scenario, comment } = parsed.data;

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } }).catch(() => null);
  await prisma.notification.create({
    data: {
      type: 'BETA_FEEDBACK',
      message: `[베타 피드백] ${scenario} (${rating}/5): ${comment}`,
      payload: { rating, scenario, by: session.user.id },
      targetUserId: admin?.id ?? null,
    },
  });

  await logAudit({
    userId: session.user.id,
    userRole: session.user.role,
    action: 'BETA_FEEDBACK_SUBMITTED',
    table: 'Notification',
    after: { rating, scenario },
  });

  return { ok: true, message: '피드백이 제출되었습니다. 감사합니다!' };
}
