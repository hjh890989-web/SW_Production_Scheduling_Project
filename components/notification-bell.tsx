'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { markNotificationRead, type NotificationView } from '@/lib/notification-actions';

/**
 * 헤더 알림 벨 (T4.3). 미확인 카운트 뱃지 + 드롭다운. (dashboard)/layout.tsx에서 마운트(T4.1).
 */
export function NotificationBell({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: NotificationView[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [, startTransition] = useTransition();

  function onRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    startTransition(() => {
      void markNotificationRead(id);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted"
        aria-label={`알림 ${unread}건`}
      >
        <span aria-hidden className="text-xl">
          🔔
        </span>
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-md border bg-background shadow-lg">
          <div className="border-b px-4 py-2 text-sm font-semibold">알림 ({unread} 미확인)</div>
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">알림이 없습니다.</p>}
          <ul>
            {items.map((n) => {
              const body = (
                <div className={`flex flex-col gap-0.5 px-4 py-3 text-sm hover:bg-muted ${n.read ? 'opacity-60' : ''}`}>
                  {n.title && <span className="font-medium">{n.title}</span>}
                  <span>{n.message}</span>
                  <span className="text-xs text-muted-foreground">{n.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
              );
              return (
                <li key={n.id} className="border-b last:border-0" onClick={() => onRead(n.id)}>
                  {n.link ? <Link href={n.link}>{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
