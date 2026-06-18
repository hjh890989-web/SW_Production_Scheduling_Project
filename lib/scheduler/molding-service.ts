import { prisma } from '@/lib/db';
import {
  generateMoldingSchedule,
  type SchedulerInput,
  type SchedulerItem,
  type SchedulerResult,
} from '@/lib/scheduler/molding-scheduler';
import { deriveSchedulerItem } from '@/lib/scheduler/slot-eligibility';
import { createSolverEngine } from '@/lib/scheduler/solver-client';
import type { Algorithm } from '@/lib/scheduler/algorithm-toggle';
import type { ScheduleEntryInput } from '@/lib/gantt/adapter';
import { checkRuleViolations, type RuleViolation } from '@/lib/molding/rule-check';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 해당 일자가 속한 주의 월요일(UTC) YYYY-MM-DD. */
export function weekMonday(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  const dow = d.getUTCDay(); // 0=일
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return iso(d);
}

function slotsOf(capacity: unknown): string[] {
  const c = (capacity ?? {}) as { slots?: string[] };
  return c.slots ?? [];
}

export interface BuiltInput {
  input: SchedulerInput;
  equipmentIdByCode: Record<string, string>;
  codeById: Record<string, string>; // 전체 품번(스케줄 제외분 포함) itemId→productCode — 경고 표시용
}

/** 경고(품번코드·납기·사유)를 사람이 읽을 형태로 변환. */
export interface WarningDetail {
  productCode: string;
  deliveryDate: string;
  reason: string;
}

/** DB → SchedulerInput (T5.4). 주간 시작부터 28일 horizon의 영업일·ACTIVE 수주 사용. */
export async function buildSchedulerInput(weekStartISO: string): Promise<BuiltInput> {
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const horizonEnd = new Date(weekStart);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + 28);

  const equipment = await prisma.equipment.findMany({ where: { type: { in: ['MOLDING_LP', 'MOLDING_IC'] } } });
  const eqInputs = equipment.map((e) => ({ code: e.code, type: e.type, slots: slotsOf(e.capacity), isActive: e.isActive }));
  const lpSlots = [...new Set(eqInputs.filter((e) => e.type === 'MOLDING_LP').flatMap((e) => e.slots))];
  const icSlots = [...new Set(eqInputs.filter((e) => e.type === 'MOLDING_IC').flatMap((e) => e.slots))];

  const itemsRaw = await prisma.item.findMany();
  const items: Record<string, SchedulerItem> = {};
  for (const it of itemsRaw) {
    const s = deriveSchedulerItem(it, lpSlots, icSlots);
    if (s) items[it.id] = s;
  }

  const orders = await prisma.order.findMany({
    where: { status: 'ACTIVE', deliveryDate: { gte: weekStart, lte: horizonEnd } },
  });

  // 캐파 채움용 미래 수요: horizon 이후 ~1개월 이내 KD·월예상 ACTIVE 수주(선행생산 후보).
  const fillEnd = new Date(horizonEnd);
  fillEnd.setUTCDate(fillEnd.getUTCDate() + 28);
  const fillOrdersRaw = await prisma.order.findMany({
    where: {
      status: 'ACTIVE',
      sourceType: { in: ['kd', 'monthly_forecast'] },
      deliveryDate: { gt: horizonEnd, lte: fillEnd },
    },
  });

  const cal = await prisma.calendarDay.findMany({
    where: { isWorkday: true, date: { gte: weekStart, lte: horizonEnd } },
    orderBy: { date: 'asc' },
  });

  // 채움은 표시 주차(weekStart~+6)로 한정 — 보이는 빈 슬롯부터 메운다.
  const weekEndForFill = new Date(weekStart);
  weekEndForFill.setUTCDate(weekEndForFill.getUTCDate() + 6);
  const fillWorkdays = cal.filter((c) => c.date <= weekEndForFill).map((c) => iso(c.date));

  const paramRows = await prisma.operationParam.findMany({ where: { key: { in: ['lp_rotation_day', 'lp_rotation_night'] } } });
  const paramVal = (key: string, dflt: number) => {
    const p = paramRows.find((r) => r.key === key);
    return p ? Number(p.value) : dflt;
  };

  const input: SchedulerInput = {
    orders: orders.map((o) => ({ itemId: o.itemId, deliveryDate: iso(o.deliveryDate), quantity: o.quantity, orderId: o.id })),
    items,
    equipment: eqInputs,
    workdays: cal.map((c) => iso(c.date)),
    rotationsPerDay: paramVal('lp_rotation_day', 8),
    rotationsPerNight: paramVal('lp_rotation_night', 10),
    fillOrders: fillOrdersRaw.map((o) => ({ itemId: o.itemId, deliveryDate: iso(o.deliveryDate), quantity: o.quantity, orderId: o.id })),
    fillWorkdays,
  };

  return {
    input,
    equipmentIdByCode: Object.fromEntries(equipment.map((e) => [e.code, e.id])),
    codeById: Object.fromEntries(itemsRaw.map((it) => [it.id, it.productCode])),
  };
}

/** 자동 스케줄 생성 + AUTO 분 영속(기존 MANUAL/CONFIRMED 보존). 반환: 결과. */
export async function generateAndSave(
  weekStartISO: string,
  algo: Algorithm = 'rule',
): Promise<SchedulerResult & { saved: number; engine: 'rule' | 'solver'; warningDetails: WarningDetail[] }> {
  const { input, equipmentIdByCode, codeById } = await buildSchedulerInput(weekStartISO);
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);

  const ruleResult = generateMoldingSchedule(input);
  let result: SchedulerResult = ruleResult;
  let engine: 'rule' | 'solver' = 'rule';

  if (algo === 'solver') {
    // SchedulerInput ≈ SolverInput (weekStart만 추가). 솔버 미설정/장애 시 Mock(빈) → 룰 fallback.
    const sr = await createSolverEngine().scheduleMolding({ weekStart: weekStartISO, ...input });
    if (sr.engine === 'solver' && sr.assignments.length > 0) {
      result = {
        schedules: sr.assignments.map((a) => ({
          date: a.date,
          daynight: a.daynight === 'NIGHT' ? 'NIGHT' : 'DAY',
          equipmentCode: a.equipmentCode,
          slot: a.slot,
          itemId: a.itemId,
          productCode: input.items[a.itemId]?.productCode ?? '',
          rotations: a.rotations ?? 0,
          status: 'AUTO',
          orderId: a.orderId ?? undefined,
        })),
        warnings: sr.warnings.map((reason) => ({ itemId: '', deliveryDate: '', reason })),
      };
      engine = 'solver';
    } else {
      // 솔버 미가동(Mock)·빈 결과 → 룰 결과 사용 + 솔버 경고를 함께 노출
      result = {
        schedules: ruleResult.schedules,
        warnings: [...sr.warnings.map((reason) => ({ itemId: '', deliveryDate: '', reason })), ...ruleResult.warnings],
      };
    }
  }

  await prisma.moldingSchedule.deleteMany({ where: { weekStart, status: 'AUTO' } });
  if (result.schedules.length > 0) {
    await prisma.moldingSchedule.createMany({
      data: result.schedules
        .filter((s) => equipmentIdByCode[s.equipmentCode])
        .map((s) => ({
          weekStart,
          date: new Date(`${s.date}T00:00:00.000Z`),
          daynight: s.daynight,
          equipmentId: equipmentIdByCode[s.equipmentCode],
          slotPosition: s.slot,
          itemId: s.itemId,
          orderId: s.orderId ?? null,
          rotations: s.rotations,
          status: 'AUTO',
        })),
    });
  }
  const warningDetails: WarningDetail[] = result.warnings.map((w) => ({
    productCode: w.itemId ? (codeById[w.itemId] ?? w.itemId) : '(솔버)',
    deliveryDate: w.deliveryDate,
    reason: w.reason + (w.shortfallRotations ? ` (부족 ${w.shortfallRotations}회전)` : ''),
  }));

  return { ...result, saved: result.schedules.length, engine, warningDetails };
}

/** 주간 MoldingSchedule → 그리드 엔트리(어댑터 입력). */
export async function loadWeekEntries(weekStartISO: string): Promise<ScheduleEntryInput[]> {
  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const rows = await prisma.moldingSchedule.findMany({
    where: { weekStart },
    include: { equipment: { select: { code: true } }, item: { select: { productCode: true } } },
  });

  // 선행생산 판정: 이번 주 생산이지만 납기가 표시 주차 이후인 셀(orderId 납기 조회).
  const orderIds = [...new Set(rows.map((r) => r.orderId).filter((x): x is string => !!x))];
  const orderRows = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, deliveryDate: true } })
    : [];
  const deliveryById = new Map(orderRows.map((o) => [o.id, o.deliveryDate]));

  return rows.map((r) => ({
    date: iso(r.date),
    daynight: r.daynight === 'NIGHT' ? 'NIGHT' : 'DAY',
    equipmentCode: r.equipment.code,
    slot: r.slotPosition,
    itemId: r.itemId,
    productCode: r.item.productCode,
    rotations: r.rotations,
    status: r.status === 'MANUAL' ? 'MANUAL' : r.status === 'CONFIRMED' ? 'CONFIRMED' : 'AUTO',
    ruleViolation: r.ruleViolation,
    prebuild: !!(r.orderId && deliveryById.get(r.orderId) && (deliveryById.get(r.orderId) as Date) > weekEnd),
    scheduleId: r.id,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** 전 성형 장비의 LP/IC 슬롯 합집합 (드래그 룰 판정용). */
export async function moldingSlotLists(): Promise<{ lpSlots: string[]; icSlots: string[] }> {
  const equipment = await prisma.equipment.findMany({ where: { type: { in: ['MOLDING_LP', 'MOLDING_IC'] } } });
  const lpSlots = [...new Set(equipment.filter((e) => e.type === 'MOLDING_LP').flatMap((e) => slotsOf(e.capacity)))];
  const icSlots = [...new Set(equipment.filter((e) => e.type === 'MOLDING_IC').flatMap((e) => slotsOf(e.capacity)))];
  return { lpSlots, icSlots };
}

/** 주간 스케줄의 위치 제약(O/X) 위반 목록 (T5.7 — 경고용, 차단 아님). */
export async function getWeekViolations(weekStartISO: string): Promise<RuleViolation[]> {
  const [entries, { lpSlots, icSlots }] = await Promise.all([loadWeekEntries(weekStartISO), moldingSlotLists()]);
  const itemIds = [...new Set(entries.map((e) => e.itemId))];
  const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
  const allowedByItem: Record<string, string[]> = {};
  for (const it of items) {
    const d = deriveSchedulerItem(it, lpSlots, icSlots);
    if (d) allowedByItem[it.id] = d.allowedSlots;
  }
  return checkRuleViolations(
    entries.map((e) => ({
      scheduleId: e.scheduleId,
      itemId: e.itemId,
      productCode: e.productCode,
      slot: e.slot,
      equipmentCode: e.equipmentCode,
      date: e.date,
    })),
    allowedByItem,
  );
}
