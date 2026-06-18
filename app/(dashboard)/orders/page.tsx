import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { UploadBatches, type BatchRow } from './upload-batches';

export const metadata: Metadata = { title: '수주 현황 · EVS' };
export const dynamic = 'force-dynamic';

const LIMIT = 500;

const SOURCE_LABEL: Record<string, string> = {
  weekly_plan: '주간 계획',
  kd: 'KD 발주',
  monthly_forecast: '월예상/통합',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  CHANGED: 'CHANGED',
  CANCELLED: 'CANCELLED',
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; status?: string; q?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const session = await auth();

  if (!hasPermission(session?.user, 'order:read')) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-2xl font-bold">수주 현황</h1>
        <p className="rounded-md bg-amber-50 p-4 text-amber-800">수주 조회 권한(order:read)이 없습니다.</p>
      </main>
    );
  }

  // 기본값: ACTIVE만(superseded 등 노이즈 숨김). source/q/날짜는 선택 필터.
  const status = sp.status ?? 'ACTIVE';
  const where: Prisma.OrderWhereInput = {};
  if (status !== 'ALL') where.status = status;
  if (sp.source && sp.source !== 'ALL') where.sourceType = sp.source;
  if (sp.q) {
    where.OR = [
      { rawProductCode: { contains: sp.q } },
      { item: { is: { productCode: { contains: sp.q } } } },
    ];
  }
  if (sp.from || sp.to) {
    where.deliveryDate = {};
    if (sp.from) where.deliveryDate.gte = new Date(`${sp.from}T00:00:00.000Z`);
    if (sp.to) where.deliveryDate.lte = new Date(`${sp.to}T23:59:59.999Z`);
  }

  const canDelete = hasPermission(session?.user, 'order:upload');

  const [total, orders, batchAgg] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { item: { select: { productCode: true, customerCode: true, material: true } } },
      orderBy: [{ deliveryDate: 'asc' }, { rawProductCode: 'asc' }],
      take: LIMIT,
    }),
    canDelete
      ? prisma.order.groupBy({
          by: ['uploadBatchId', 'sourceType'],
          where: { uploadBatchId: { not: null } },
          _count: { _all: true },
          _sum: { quantity: true },
          _max: { createdAt: true },
          orderBy: { _max: { createdAt: 'desc' } },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const totalQty = orders.reduce((s, o) => s + o.quantity, 0);

  const batches: BatchRow[] = batchAgg.map((b) => ({
    batchId: b.uploadBatchId as string,
    sourceType: b.sourceType,
    count: b._count._all,
    quantity: b._sum.quantity ?? 0,
    uploadedAt: (b._max.createdAt ?? new Date(0)).toISOString(),
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">수주 현황</h1>
        <p className="mt-1 text-base text-muted-foreground">
          업로드·통합된 수주를 납기일순으로 조회합니다. 기본은 ACTIVE만 표시합니다.
        </p>
      </header>

      {canDelete && <UploadBatches batches={batches} />}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col">
          종류
          <select name="source" defaultValue={sp.source ?? 'ALL'} className="h-9 rounded border border-input px-2">
            <option value="ALL">전체</option>
            <option value="weekly_plan">주간 계획</option>
            <option value="kd">KD 발주</option>
            <option value="monthly_forecast">월예상/통합</option>
          </select>
        </label>
        <label className="flex flex-col">
          상태
          <select name="status" defaultValue={status} className="h-9 rounded border border-input px-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUPERSEDED">SUPERSEDED</option>
            <option value="CHANGED">CHANGED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="ALL">전체</option>
          </select>
        </label>
        <label className="flex flex-col">
          품번 검색
          <input name="q" defaultValue={sp.q ?? ''} placeholder="품번/원본코드" className="h-9 rounded border border-input px-2" />
        </label>
        <label className="flex flex-col">
          납기 시작
          <input type="date" name="from" defaultValue={sp.from ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <label className="flex flex-col">
          납기 종료
          <input type="date" name="to" defaultValue={sp.to ?? ''} className="h-9 rounded border border-input px-2" />
        </label>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground">
          검색
        </button>
      </form>

      <p className="mb-2 text-sm text-muted-foreground">
        총 <span className="font-semibold text-foreground">{total.toLocaleString()}</span>건
        {total > LIMIT && <span> (상위 {LIMIT}건 표시)</span>} · 표시분 수량합{' '}
        <span className="font-semibold text-foreground">{totalQty.toLocaleString()}</span>
      </p>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">납기일</th>
              <th className="p-2">품번</th>
              <th className="p-2">원본 코드</th>
              <th className="p-2">고객사 코드</th>
              <th className="p-2 text-right">수량</th>
              <th className="p-2">구분</th>
              <th className="p-2">종류</th>
              <th className="p-2">신뢰도</th>
              <th className="p-2">상태</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  조건에 맞는 수주가 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2 font-mono">{iso(o.deliveryDate)}</td>
                  <td className="p-2 font-mono">{o.item.productCode}</td>
                  <td className="p-2 font-mono text-muted-foreground">{o.rawProductCode}</td>
                  <td className="p-2 font-mono text-muted-foreground">{o.item.customerCode ?? '—'}</td>
                  <td className="p-2 text-right">{o.quantity.toLocaleString()}</td>
                  <td className="p-2">{o.orderType}</td>
                  <td className="p-2">{SOURCE_LABEL[o.sourceType] ?? o.sourceType}</td>
                  <td className="p-2 text-muted-foreground">{o.confidence}</td>
                  <td className="p-2">{STATUS_LABEL[o.status] ?? o.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
