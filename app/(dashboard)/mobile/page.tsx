import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { KsfCardGrid, type KsfCard } from '@/components/mobile/ksf-card-grid';

export const metadata: Metadata = { title: '모바일 KSF · EVS' };
export const dynamic = 'force-dynamic';

/**
 * T12.5.2 모바일 KSF 대시보드 (F-9). 최신 2개 스냅샷으로 현재값·전일대비 추세.
 */
export default async function MobileKsfPage() {
  const snaps = await prisma.ksfDailySnapshot.findMany({ orderBy: { date: 'desc' }, take: 2 });
  const latest = snaps[0] ?? null;
  const prev = snaps[1] ?? null;

  const cards: KsfCard[] = [
    { key: 'ksf1', label: 'KSF-1 납기율', value: latest?.ksf1Punctuality ?? null, prev: prev?.ksf1Punctuality ?? null },
    { key: 'ksf5', label: 'KSF-5 일원화율', value: latest?.ksf5Unification ?? null, prev: prev?.ksf5Unification ?? null },
    { key: 'ksf6', label: 'KSF-6 채택률', value: latest?.ksf6Adoption ?? null, prev: prev?.ksf6Adoption ?? null },
  ];

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-xl font-bold">모바일 KSF 현황</h1>
      {latest ? (
        <p className="mb-3 text-sm text-muted-foreground">기준일 {latest.date.toISOString().slice(0, 10)}</p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">스냅샷 데이터가 아직 없습니다(전일 대비 추세는 데이터 누적 후 표시).</p>
      )}
      <KsfCardGrid cards={cards} />
    </main>
  );
}
