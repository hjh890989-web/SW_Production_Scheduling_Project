import type { Metadata } from 'next';
import { getQuarterlyReport } from '@/lib/export/quarterly-report-actions';
import { QuarterlyReportPrint } from '@/components/export/quarterly-report-print';

export const metadata: Metadata = { title: '분기 KSF 리포트 · EVS' };
export const dynamic = 'force-dynamic';

export default async function QuarterlyReportPage({ searchParams }: { searchParams: { quarter?: string } }) {
  const quarter = searchParams.quarter && /^\d{4}-Q[1-4]$/.test(searchParams.quarter) ? searchParams.quarter : '2026-Q2';
  const res = await getQuarterlyReport(quarter);
  return <QuarterlyReportPrint report={res.ok ? res.report : null} />;
}
