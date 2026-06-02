import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { buildColumns, buildRows, buildCells, type CalendarInput, type EquipmentInput } from '@/lib/gantt/adapter';
import { weekMonday, loadWeekEntries, getWeekViolations } from '@/lib/scheduler/molding-service';
import { MoldingClient } from './molding-client';

export const metadata: Metadata = { title: '성형 스케줄 W-4 · EVS' };
export const dynamic = 'force-dynamic';

function slotsOf(capacity: unknown): string[] {
  return ((capacity ?? {}) as { slots?: string[] }).slots ?? [];
}

export default async function MoldingPage({ searchParams }: { searchParams: { week?: string } }) {
  const weekStart = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
    ? weekMonday(searchParams.week)
    : weekMonday('2026-05-18');

  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const [equipment, calendar, entries, violations] = await Promise.all([
    prisma.equipment.findMany({ where: { type: { in: ['MOLDING_LP', 'MOLDING_IC'] } }, orderBy: { code: 'asc' } }),
    prisma.calendarDay.findMany({ where: { isWorkday: true, date: { gte: weekStartDate, lte: weekEnd } }, orderBy: { date: 'asc' } }),
    loadWeekEntries(weekStart),
    getWeekViolations(weekStart),
  ]);

  const calInputs: CalendarInput[] = calendar.map((c) => ({ date: c.date.toISOString().slice(0, 10), isWorkday: c.isWorkday }));
  const eqInputs: EquipmentInput[] = equipment.map((e) => ({ code: e.code, name: e.name, slots: slotsOf(e.capacity) }));

  const model = {
    columns: buildColumns(calInputs),
    rows: buildRows(eqInputs),
    cells: buildCells(entries),
  };

  const violationLabels = violations.map((v) => `${v.productCode} @ ${v.equipmentCode}/${v.slot} (${v.date})`);

  return <MoldingClient weekStart={weekStart} model={model} cellCount={entries.length} violations={violationLabels} />;
}
