import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { getNotifications, getUnreadCount } from '@/lib/notification-actions';
import { hasPermission, type Permission } from '@/lib/permissions';
import { NotificationBell } from '@/components/notification-bell';

export const dynamic = 'force-dynamic';

// perm이 있으면 해당 권한 보유자에게만 노출, 없으면 전원 노출.
const NAV: { href: string; label: string; perm?: Permission }[] = [
  { href: '/', label: '대시보드' },
  { href: '/orders/upload', label: '수주 업로드' },
  { href: '/orders/change', label: '변동 입력' },
  { href: '/molding', label: '성형 스케줄', perm: 'molding:read' },
  { href: '/extrusion', label: '압출 스케줄', perm: 'extrusion:read' },
  { href: '/orders/audit', label: '감사 이력' },
  { href: '/work-instruction', label: '작업지시서' },
  { href: '/reports/quarterly', label: '분기 리포트' },
  { href: '/master/items', label: '마스터' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? '';
  const [notifications, unread] = userId
    ? await Promise.all([getNotifications(), getUnreadCount()])
    : [[], 0];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0" aria-label="EVS 홈">
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 로고 */}
            <img src="/check-in-evs-logo.svg" alt="EVS · Check In" className="h-8 w-auto" />
          </Link>
          <nav className="flex gap-4 text-base">
            {NAV.filter((n) => !n.perm || hasPermission(session?.user, n.perm)).map((n) => (
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
          <Link
            href="/account/password"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            비밀번호 변경
          </Link>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-auto flex flex-col items-center gap-2 border-t py-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 로고(공통 Check In) */}
        <img src="/check-in-main-logo.svg" alt="Check In" className="h-16 w-auto" />
        <p className="text-sm text-muted-foreground">송우산업 사내 업무 자동화 플랫폼</p>
      </footer>
    </div>
  );
}
