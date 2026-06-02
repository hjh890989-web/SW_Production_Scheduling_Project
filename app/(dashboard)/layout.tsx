import Link from 'next/link';
import { auth } from '@/auth';
import { getNotifications, getUnreadCount } from '@/lib/notification-actions';
import { NotificationBell } from '@/components/notification-bell';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/', label: '대시보드' },
  { href: '/orders/upload', label: '수주 업로드' },
  { href: '/orders/change', label: '변동 입력' },
  { href: '/orders/audit', label: '감사 이력' },
  { href: '/work-instruction', label: '작업지시서' },
  { href: '/reports/quarterly', label: '분기 리포트' },
  { href: '/master/items', label: '마스터' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  const [notifications, unread] = userId
    ? await Promise.all([getNotifications(userId), getUnreadCount(userId)])
    : [[], 0];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            EVS
          </Link>
          <nav className="flex gap-4 text-base">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell initialNotifications={notifications} initialUnread={unread} />
          {session?.user && (
            <span className="text-sm text-muted-foreground">
              {session.user.name ?? session.user.id} · {session.user.role}
            </span>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
