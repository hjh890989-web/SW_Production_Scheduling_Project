import { prisma } from '@/lib/db';

/** 미매칭 품번 알림 생성 (T3.4). 사용자 검토용. */
export async function createUnmatchedNotification(
  codes: string[],
  targetUserId: string | null = null,
) {
  if (codes.length === 0) return null;
  return prisma.notification.create({
    data: {
      type: 'UNMATCHED_ITEM',
      message: `미매칭 품번 ${codes.length}건 — 마스터 등록이 필요합니다.`,
      payload: { codes },
      targetUserId,
    },
  });
}
