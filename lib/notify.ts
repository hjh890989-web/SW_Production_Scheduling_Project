import { prisma } from '@/lib/db';

/**
 * 내부 알림 생성 (SEC). `'use server'` 액션이 아니라 일반 서버 모듈 —
 * 서비스(재고/MES/ERP cron·API)가 세션 없이 호출한다. 외부에서 직접 호출 가능한
 * 액션 엔드포인트로 노출하지 않아 무인증 알림 주입을 차단한다.
 */
export interface NotifyInput {
  targetUserId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: NotifyInput) {
  return prisma.notification.create({
    data: {
      type: input.type,
      message: input.message,
      payload: { title: input.title, link: input.link ?? null },
      targetUserId: input.targetUserId ?? null,
    },
  });
}
