'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import type { MoldingExportRow, ExtrusionExportRow } from './excel-exporter';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ExportRowsResult {
  ok: boolean;
  message: string;
  molding: MoldingExportRow[];
  extrusion: ExtrusionExportRow[];
}

const EMPTY: { molding: MoldingExportRow[]; extrusion: ExtrusionExportRow[] } = { molding: [], extrusion: [] };

/**
 * T8.1 — 주간 성형·압출 스케줄 행을 엑셀 출력용으로 조회. molding:read + extrusion:read 필요.
 * 권한 검증은 서버에서, 다운로드는 클라이언트(excel-client)에서 수행한다.
 */
export async function getScheduleExportRows(weekStartISO: string): Promise<ExportRowsResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'molding:read');
    requirePermission(session?.user, 'extrusion:read');
  } catch {
    return { ok: false, message: '출력 권한(molding/extrusion:read)이 없습니다.', ...EMPTY };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) {
    return { ok: false, message: '주간 시작일 형식이 올바르지 않습니다.', ...EMPTY };
  }

  const weekStart = new Date(`${weekStartISO}T00:00:00.000Z`);

  const [moldingRows, extrusionRows] = await Promise.all([
    prisma.moldingSchedule.findMany({
      where: { weekStart },
      include: { item: true, equipment: true },
      orderBy: [{ date: 'asc' }, { equipmentId: 'asc' }],
    }),
    prisma.extrusionSchedule.findMany({
      where: { weekStart },
      include: { item: true, extruder: true },
      orderBy: [{ date: 'asc' }, { extruderId: 'asc' }],
    }),
  ]);

  const molding: MoldingExportRow[] = moldingRows.map((r) => ({
    date: iso(r.date),
    daynight: r.daynight === 'NIGHT' ? 'NIGHT' : 'DAY',
    equipmentCode: r.equipment.code,
    slotPosition: r.slotPosition,
    productCode: r.item.productCode,
    rotations: r.rotations,
    status: r.status,
  }));

  const extrusion: ExtrusionExportRow[] = extrusionRows.map((r) => ({
    date: iso(r.date),
    shift: r.shift,
    extruderCode: r.extruder.code,
    productCode: r.item.productCode,
    quantity: r.quantity,
    headPin: r.headPin,
    status: r.status,
  }));

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'SCHEDULE_EXCEL_EXPORTED',
    table: 'MoldingSchedule',
    key: weekStartISO,
    after: { molding: molding.length, extrusion: extrusion.length },
  });

  return { ok: true, message: '조회 완료', molding, extrusion };
}
