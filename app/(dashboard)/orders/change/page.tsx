import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { ChangeForm } from './change-form';

export const metadata: Metadata = { title: '수주 변동 입력 · EVS' };
export const dynamic = 'force-dynamic';

export default async function OrderChangePage() {
  const items = await prisma.item.findMany({ select: { productCode: true }, orderBy: { productCode: 'asc' } });
  const codes = items.map((i) => i.productCode);

  return (
    <main className="mx-auto max-w-xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">수주 변동 입력 (W-3)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          메일·카톡으로 통보된 변동을 즉시 입력합니다. 저장 후 5초 내 취소할 수 있습니다. (시뮬레이션은 Sprint 7)
        </p>
      </header>
      <ChangeForm productCodes={codes} />
    </main>
  );
}
