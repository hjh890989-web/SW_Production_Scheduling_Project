import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { buildExtGrid } from '@/lib/extrusion/grid';
import { weekMonday } from '@/lib/scheduler/molding-service';
import { loadWeekExtrusion, getWeekDieChange, getWeekLoadBalance } from '@/lib/extrusion/extrusion-service';
import { matchedCellKeys } from '@/lib/impact/highlight';
import { ExtrusionClient } from './extrusion-client';

export const metadata: Metadata = { title: '압출 스케줄 W-5 · EVS' };
export const dynamic = 'force-dynamic';

export default async function ExtrusionPage({ searchParams }: { searchParams: { week?: string; highlightItem?: string } }) {
  const weekStart = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week)
    ? weekMonday(searchParams.week)
    : weekMonday('2026-05-18');

  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
  const weekEnd = new Date(weekStartDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const [extruders, calendar, entries, dieChange, load] = await Promise.all([
    prisma.equipment.findMany({ where: { type: 'EXTRUSION' }, orderBy: { code: 'asc' } }),
    prisma.calendarDay.findMany({ where: { isWorkday: true, date: { gte: weekStartDate, lte: weekEnd } }, orderBy: { date: 'asc' } }),
    loadWeekExtrusion(weekStart),
    getWeekDieChange(weekStart),
    getWeekLoadBalance(weekStart),
  ]);

  const model = buildExtGrid(
    calendar.map((c) => ({ date: c.date.toISOString().slice(0, 10), isWorkday: c.isWorkday })),
    extruders.map((e) => ({ code: e.code, name: e.name })),
    entries,
  );

  return (
    <ExtrusionClient
      weekStart={weekStart}
      model={model}
      cellCount={entries.length}
      dieChange={{ autoTotal: dieChange.autoTotal, baselineTotal: dieChange.baselineTotal, reductionPct: Math.round(dieChange.reductionPct) }}
      load={load}
      highlightKeys={searchParams.highlightItem ? matchedCellKeys(model.cells, searchParams.highlightItem) : []}
      highlightItem={searchParams.highlightItem}
    />
  );
}
