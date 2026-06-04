import type { Metadata } from 'next';
import { getQuarterlyReport } from '@/lib/export/quarterly-report-actions';
import { toBeforeAfterMetrics } from '@/lib/ksf/report-mobile';
import { BeforeAfter } from '@/components/mobile/before-after';

export const metadata: Metadata = { title: '모바일 분기 리포트 · EVS' };
export const dynamic = 'force-dynamic';

/**
 * T12.5.5 모바일 분기 리포트 (F-9). 도입 前後 비교를 모바일 카드로. 인쇄는 데스크톱(/reports/quarterly).
 */
export default async function MobileReportPage({ searchParams }: { searchParams: Promise<{ quarter?: string }> }) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const quarter = sp.quarter && /^\d{4}-Q[1-4]$/.test(sp.quarter) ? sp.quarter : '2026-Q2';
  const res = await getQuarterlyReport(quarter);

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-1 text-xl font-bold">분기 리포트 {quarter}</h1>
      {res.ok && res.report ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            도입일 {res.report.adoptionDate} · 전 {res.report.before.count}일 / 후 {res.report.after.count}일
          </p>
          <BeforeAfter metrics={toBeforeAfterMetrics(res.report)} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{res.message ?? '리포트 데이터가 없습니다.'}</p>
      )}
    </main>
  );
}
