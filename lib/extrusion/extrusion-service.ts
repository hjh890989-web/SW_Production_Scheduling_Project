import { prisma } from '@/lib/db';
import {
  generateExtrusionSchedule,
  type ExtrusionInput,
  type ExtrusionItem,
  type ExtrusionResult,
} from '@/lib/scheduler/extrusion-scheduler';
import { generatePipeRequests, type ScheduleForPipe, type PipeRequestItem } from '@/lib/scheduler/pipe-request';
import type { ExtEntryInput } from '@/lib/extrusion/grid';
import type { Shift } from '@/lib/extrusion/die-change';
import { dieChangeSummary, type DieChangeSummary } from '@/lib/extrusion/die-change-summary';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 주간 다이/노즐 변경 요약 (T6.4 — KSF-2, 계획 기준). */
export async function getWeekDieChange(weekStartISO: string): Promise<DieChangeSummary> {
  const entries = await loadWeekExtrusion(weekStartISO);
  return dieChangeSummary(
    entries.map((e) => ({ extruderCode: e.extruderCode, date: e.date, shift: e.shift, extrusionGroup: e.extrusionGroup, headPin: e.headPin })),
  );
}

const DEFAULT_SHIFT_CAPACITY = 1000;

export interface BuiltExtrusionInput {
  input: ExtrusionInput;
  extruderIdByCode: Record<string, string>;
}

/** DB(성형 스케줄→관체 요청) → ExtrusionInput (T6.2). */
export async function buildExtrusionInput(weekStartISO: string): Promise<BuiltExtrusionInput> {
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const horizonEnd = new Date(weekStart);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + 28);

  const molding = await prisma.moldingSchedule.findMany({
    where: { date: { gte: weekStart, lte: horizonEnd } },
    include: { item: { select: { productCode: true, lpMoldsPerAngle: true, icMoldsPerAngle: true } } },
  });

  // 성형 배치 → 관체 요청 (T5.3)
  const pipeSchedules: ScheduleForPipe[] = molding.map((m) => ({
    itemId: m.itemId,
    productCode: m.item.productCode,
    date: iso(m.date),
    rotations: m.rotations,
  }));
  const pipeItems: Record<string, PipeRequestItem> = {};
  for (const m of molding) {
    pipeItems[m.itemId] = { moldsPerAngle: m.item.lpMoldsPerAngle || m.item.icMoldsPerAngle || 1, alloyMold: null };
  }
  const { requests } = generatePipeRequests(pipeSchedules, pipeItems);

  const itemsRaw = await prisma.item.findMany();
  const items: Record<string, ExtrusionItem> = {};
  for (const it of itemsRaw) {
    items[it.id] = {
      itemId: it.id,
      productCode: it.productCode,
      extrusionGroup: it.extrusionGroup,
      headPin: it.headPin,
      extruderFord: it.extruderFord,
      extruderNew: it.extruderNew,
    };
  }

  const extruders = await prisma.equipment.findMany({ where: { type: 'EXTRUSION' } });
  const cal = await prisma.calendarDay.findMany({
    where: { isWorkday: true, date: { gte: weekStart, lte: horizonEnd } },
    orderBy: { date: 'asc' },
  });
  const effRow = await prisma.operationParam.findUnique({ where: { key: 'extrusion_efficiency' } });
  const capRow = await prisma.operationParam.findUnique({ where: { key: 'extrusion_shift_capacity' } });

  const input: ExtrusionInput = {
    pipeRequests: requests.map((r) => ({ itemId: r.itemId, productCode: r.productCode, extrusionDeadline: r.extrusionDeadline, pipeQuantity: r.pipeQuantity })),
    items,
    extruders: extruders.map((e) => ({ code: e.code, isActive: e.isActive })),
    workdays: cal.map((c) => iso(c.date)),
    shiftCapacity: capRow ? Number(capRow.value) : DEFAULT_SHIFT_CAPACITY,
    efficiency: effRow ? Number(effRow.value) : 0.75,
  };

  return { input, extruderIdByCode: Object.fromEntries(extruders.map((e) => [e.code, e.id])) };
}

export async function generateAndSaveExtrusion(weekStartISO: string): Promise<ExtrusionResult & { saved: number }> {
  const { input, extruderIdByCode } = await buildExtrusionInput(weekStartISO);
  const result = generateExtrusionSchedule(input);
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);

  await prisma.extrusionSchedule.deleteMany({ where: { weekStart, status: 'AUTO' } });
  if (result.schedules.length > 0) {
    await prisma.extrusionSchedule.createMany({
      data: result.schedules
        .filter((s) => extruderIdByCode[s.extruderCode])
        .map((s) => ({
          weekStart,
          date: new Date(`${s.date}T00:00:00.000Z`),
          shift: s.shift,
          extruderId: extruderIdByCode[s.extruderCode],
          itemId: s.itemId,
          orderId: s.orderId ?? null,
          quantity: s.quantity,
          extrusionGroup: s.extrusionGroup,
          headPin: s.headPin,
          status: 'AUTO',
        })),
    });
  }
  return { ...result, saved: result.schedules.length };
}

export async function loadWeekExtrusion(weekStartISO: string): Promise<ExtEntryInput[]> {
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const rows = await prisma.extrusionSchedule.findMany({
    where: { weekStart },
    include: { extruder: { select: { code: true } }, item: { select: { productCode: true } } },
  });
  return rows.map((r) => ({
    date: iso(r.date),
    shift: r.shift as Shift,
    extruderCode: r.extruder.code,
    itemId: r.itemId,
    productCode: r.item.productCode,
    quantity: r.quantity,
    extrusionGroup: r.extrusionGroup,
    headPin: r.headPin,
    status: r.status === 'MANUAL' ? 'MANUAL' : r.status === 'CONFIRMED' ? 'CONFIRMED' : 'AUTO',
    ruleViolation: r.ruleViolation,
    scheduleId: r.id,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
