'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export interface NotifyInput {
  targetUserId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string;
}

/** 알림 생성 (T4.3 — title/link는 payload, CORE-1). */
export async function notify(input: NotifyInput) {
  return prisma.notification.create({
    data: {
      type: input.type,
      message: input.message,
      payload: { title: input.title, link: input.link ?? null },
      targetUserId: input.targetUserId ?? null,
    },
  });
}

/** 미확인 알림 수 (본인 대상 + 브로드캐스트). */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { OR: [{ targetUserId: userId }, { targetUserId: null }], read: false, cancelled: false },
  });
}

export interface NotificationView {
  id: string;
  type: string;
  message: string;
  title: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** 본인 대상 + 브로드캐스트 알림 목록(최근 20건). */
export async function getNotifications(userId: string): Promise<NotificationView[]> {
  const list = await prisma.notification.findMany({
    where: { OR: [{ targetUserId: userId }, { targetUserId: null }], cancelled: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return list.map((n) => {
    const payload = (n.payload ?? {}) as { title?: string; link?: string };
    return {
      id: n.id,
      type: n.type,
      message: n.message,
      title: payload.title ?? null,
      link: payload.link ?? null,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    };
  });
}

/** 알림 읽음 처리 (클릭 시). 본인 대상만. */
export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  await prisma.notification
    .updateMany({
      where: { id, OR: [{ targetUserId: session.user.id }, { targetUserId: null }] },
      data: { read: true },
    })
    .catch(() => null);
  revalidatePath('/');
  return { ok: true };
}
