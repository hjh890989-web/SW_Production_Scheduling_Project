import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ItemsTable, type ItemRow } from './items-table';

export const metadata: Metadata = { title: '품번 마스터 · EVS' };
export const dynamic = 'force-dynamic';

export default async function ItemsMasterPage() {
  const items = await prisma.item.findMany({
    orderBy: { productCode: 'asc' },
    include: { aliases: { select: { id: true, alias: true } } },
  });

  const rows: ItemRow[] = items.map((i) => ({
    id: i.id,
    productCode: i.productCode,
    customerCode: i.customerCode,
    hwasungCode: i.hwasungCode,
    headPin: i.headPin,
    extrusionGroup: i.extrusionGroup,
    cutLength: i.cutLength,
    extruderFord: i.extruderFord,
    extruderNew: i.extruderNew,
    updatedAt: i.updatedAt.toISOString(),
    aliases: i.aliases,
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">품번 마스터 (W-6.1)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          실리콘 {rows.length}품번. 셀을 클릭해 인라인 편집, 별칭은 관리 버튼으로 추가·삭제합니다.
        </p>
      </header>
      <ItemsTable rows={rows} />
    </main>
  );
}
