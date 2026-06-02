import type { Metadata } from 'next';
import { weekMonday } from '@/lib/scheduler/molding-service';
import { getWorkInstructions } from '@/lib/export/work-instruction-actions';
import { WorkInstructionPrint } from '@/components/export/work-instruction-print';

export const metadata: Metadata = { title: '작업지시서 · EVS' };
export const dynamic = 'force-dynamic';

export default async function WorkInstructionPage({ searchParams }: { searchParams: { week?: string } }) {
  const weekStart =
    searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
      ? weekMonday(searchParams.week)
      : weekMonday('2026-05-18');

  const res = await getWorkInstructions(weekStart);

  return <WorkInstructionPrint weekStart={weekStart} instructions={res.ok ? res.instructions : []} />;
}
