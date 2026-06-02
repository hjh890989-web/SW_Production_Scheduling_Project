'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { buildWorkInstructions, type WIRow, type WorkInstruction } from './work-instruction';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WorkInstructionResult {
  ok: boolean;
  message: string;
  instructions: WorkInstruction[];
}

/**
 * T8.2 — 주간 성형·압출 스케줄을 일별·라인별 작업지시서로 조회. molding/extrusion:read 필요.
 * 인쇄(PDF)는 클라이언트 window.print()로 수행(CORE-2).
 */
export async function getWorkInstructions(weekStartISO: string): Promise<WorkInstructionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'molding:read');
    requirePermission(session?.user, 'extrusion:read');
  } catch {
    return { ok: false, message: '출력 권한(molding/extrusion:read)이 없습니다.', instructions: [] };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) {
    return { ok: false, message: '주간 시작일 형식이 올바르지 않습니다.', instructions: [] };
  }

  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);

  const [moldingRows, extrusionRows] = await Promise.all([
    prisma.moldingSchedule.findMany({
      where: { weekStart },
      include: { item: true, equipment: true },
    }),
    prisma.extrusionSchedule.findMany({
      where: { weekStart },
      include: { item: true, extruder: true },
    }),
  ]);

  const rows: WIRow[] = [
    ...moldingRows.map<WIRow>((r) => ({
      date: iso(r.date),
      line: r.equipment.code,
      process: '성형',
      slot: `${r.daynight === 'NIGHT' ? '야간' : '주간'}/${r.slotPosition}`,
      productCode: r.item.productCode,
      qty: r.rotations,
      status: r.status,
    })),
    ...extrusionRows.map<WIRow>((r) => ({
      date: iso(r.date),
      line: r.extruder.code,
      process: '압출',
      slot: r.shift,
      productCode: r.item.productCode,
      qty: r.quantity,
      status: r.status,
    })),
  ];

  const instructions = buildWorkInstructions(rows);

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'WORK_INSTRUCTION_PRINTED',
    table: 'MoldingSchedule',
    key: weekStartISO,
    after: { count: instructions.length },
  });

  return { ok: true, message: '조회 완료', instructions };
}
