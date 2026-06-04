import Link from 'next/link';
import { auth } from '@/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * 403 Forbidden 페이지 (T1.3 — AC MR-1-F1).
 * 권한 미충족 접근 시도를 AuditLog `UNAUTHORIZED_ACCESS`로 기록한다 (T1.6 logAudit).
 */
async function recordUnauthorized(from: string | null): Promise<void> {
  const session = await auth();
  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'UNAUTHORIZED_ACCESS',
    table: 'Page',
    key: from,
  });
}

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const from = typeof sp.from === 'string' ? sp.from : null;
  await recordUnauthorized(from);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <p className="text-6xl font-bold text-red-600">403</p>
      <h1 className="text-2xl font-semibold">접근 권한이 없습니다</h1>
      <p className="max-w-md text-base text-muted-foreground">
        {from ? `요청하신 페이지(${from})에` : '요청하신 페이지에'} 접근할 권한이 없습니다.
        필요한 권한은 시스템 관리자에게 문의하세요.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 min-w-44 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
