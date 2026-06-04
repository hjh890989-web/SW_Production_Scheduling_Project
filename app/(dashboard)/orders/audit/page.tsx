import type { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { buildAuditWhere } from '@/lib/audit-query';
import { AuditList, type AuditRow } from './audit-list';

export const metadata: Metadata = { title: '감사 이력 · EVS' };
export const dynamic = 'force-dynamic';

export default async function AuditHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; table?: string; action?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const session = await auth();
  const userId = session?.user?.id ?? '';
  const canViewAll = hasPermission(session?.user, 'audit:read');

  const where = buildAuditWhere(sp, canViewAll, userId);
  const logs = await prisma.auditLog.findMany({ where, orderBy: { timestamp: 'desc' }, take: 200 });

  const rows: AuditRow[] = logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    userId: l.userId,
    userRole: l.userRole,
    action: l.action,
    targetTable: l.targetTable,
    targetKey: l.targetKey,
    before: l.beforeValue,
    after: l.afterValue,
  }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">감사 이력 (W-8)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {canViewAll ? '전체 변경 이력' : '본인 변경 이력'}을 시간순으로 조회합니다. (5년 보존, R-13)
        </p>
      </header>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-sm">
        {canViewAll && (
          <label className="flex flex-col">
            사용자ID
            <input name="user" defaultValue={sp.user ?? ''} className="h-9 rounded border border-input px-2" />
          </label>
        )}
        <label className="flex flex-col">
          테이블
          <input name="table" defaultValue={sp.table ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <label className="flex flex-col">
          액션
          <input name="action" defaultValue={sp.action ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <label className="flex flex-col">
          시작일
          <input type="date" name="from" defaultValue={sp.from ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <label className="flex flex-col">
          종료일
          <input type="date" name="to" defaultValue={sp.to ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground">
          검색
        </button>
      </form>

      <AuditList rows={rows} />
    </main>
  );
}
