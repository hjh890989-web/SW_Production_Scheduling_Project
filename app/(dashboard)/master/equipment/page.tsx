import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { EquipmentTable, type EquipmentRow } from './equipment-table';

export const metadata: Metadata = { title: '장비 마스터 · EVS' };
export const dynamic = 'force-dynamic';

const TYPE_ORDER: Record<string, number> = { MOLDING_LP: 0, MOLDING_IC: 1, EXTRUSION: 2 };

export default async function EquipmentMasterPage() {
  const equipment = await prisma.equipment.findMany({ orderBy: { code: 'asc' } });

  const rows: EquipmentRow[] = equipment
    .map((e) => {
      const cap = (e.capacity ?? {}) as { slots?: string[]; lines?: string[] };
      return {
        id: e.id,
        code: e.code,
        name: e.name,
        type: e.type,
        slotCount: cap.slots?.length ?? cap.lines?.length ?? 0,
        isActive: e.isActive,
        updatedAt: e.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || a.code.localeCompare(b.code));

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">장비 마스터 (W-6.2)</h1>
        <p className="mt-1 text-base text-muted-foreground">가류기·압출기 {rows.length}대. 가동 상태를 토글하고 이름을 편집합니다.</p>
      </header>
      <EquipmentTable rows={rows} />
    </main>
  );
}
