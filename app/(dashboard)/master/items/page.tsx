import type { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { ItemsTable, type ItemRow } from './items-table';
import { AddItemForm } from './add-item-form';

export const metadata: Metadata = { title: '품번 마스터 · EVS' };
export const dynamic = 'force-dynamic';

export default async function ItemsMasterPage() {
  const session = await auth();
  const canWrite = hasPermission(session?.user, 'master:write');
  const items = await prisma.item.findMany({
    orderBy: { productCode: 'asc' },
    include: { aliases: { select: { id: true, alias: true } } },
  });

  const rows: ItemRow[] = items.map((i) => ({
    id: i.id,
    productCode: i.productCode,
    material: i.material,
    customerCode: i.customerCode,
    hwasungCode: i.hwasungCode,
    headPin: i.headPin,
    extrusionGroup: i.extrusionGroup,
    cutLength: i.cutLength,
    extruderFord: i.extruderFord,
    extruderNew: i.extruderNew,
    lpMoldsPerAngle: i.lpMoldsPerAngle,
    icMoldsPerAngle: i.icMoldsPerAngle,
    lpPosTop: i.lpPosTop,
    updatedAt: i.updatedAt.toISOString(),
    aliases: i.aliases,
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">품번 마스터 (W-6.1)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {rows.length}품번(실리콘·EPDM·NBR). 자재 필터로 좁히고, 셀을 클릭해 인라인 편집, 별칭은 관리 버튼으로 추가·삭제합니다.
        </p>
      </header>
      {canWrite && (
        <div className="mb-4">
          <AddItemForm />
        </div>
      )}
      <ItemsTable rows={rows} />
    </main>
  );
}
