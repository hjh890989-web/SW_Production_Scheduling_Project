import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export const metadata: Metadata = { title: '대시보드 · EVS' };
export const dynamic = 'force-dynamic';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const KSF_LABELS = ['납기율', '다이/노즐 변경', '스케줄링 시간', '재고 적정', '일원화율', '수동보정 채택률'];

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const [orderCount, activeOrders, unreadNotis, weekAgg] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'ACTIVE' } }),
    prisma.notification.count({
      where: { OR: [{ targetUserId: user?.id ?? '' }, { targetUserId: null }], read: false, cancelled: false },
    }),
    prisma.order.groupBy({ by: ['sourceType'], where: { status: 'ACTIVE' }, _sum: { quantity: true } }),
  ]);

  const showMolding = hasPermission(user, 'molding:read');
  const showExtrusion = hasPermission(user, 'extrusion:read');

  if (orderCount === 0) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-2xl font-bold">통합 대시보드 (W-1)</h1>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-lg font-medium">표시할 수주 데이터가 없습니다.</p>
          <p className="mt-1 text-base text-muted-foreground">수주 엑셀을 업로드하면 대시보드가 채워집니다.</p>
          <Link
            href="/orders/upload"
            className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
          >
            수주 업로드로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">통합 대시보드 (W-1)</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="변동 알림">
          <p className="text-3xl font-bold text-red-600">{unreadNotis}</p>
          <p className="text-sm text-muted-foreground">미확인 알림</p>
        </Card>

        <Card title="이번 주 수주">
          <p className="text-3xl font-bold">{activeOrders}</p>
          <p className="text-sm text-muted-foreground">ACTIVE 수주 건수 (전체 {orderCount})</p>
          <ul className="mt-2 text-sm">
            {weekAgg.map((a) => (
              <li key={a.sourceType} className="flex justify-between">
                <span className="text-muted-foreground">{a.sourceType}</span>
                <span>{a._sum.quantity ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="KSF 6지표">
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {KSF_LABELS.map((k) => (
              <li key={k} className="flex justify-between rounded bg-muted/50 px-2 py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-muted-foreground">—</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">실 데이터는 KSF 스냅샷(T4.4) 적재 후</p>
        </Card>

        {showMolding && (
          <Card title="성형 진행률">
            <p className="text-base text-muted-foreground">MES 연동 후 본격 표시</p>
          </Card>
        )}

        {showExtrusion && (
          <Card title="압출 진행률">
            <p className="text-base text-muted-foreground">MES 연동 후 본격 표시</p>
          </Card>
        )}
      </div>
    </main>
  );
}
