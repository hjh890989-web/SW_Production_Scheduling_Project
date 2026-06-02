'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import {
  buildQuarterlyReport,
  quarterRange,
  type SnapshotInput,
  type QuarterlyReport,
} from './quarterly-report';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface QuarterlyReportResult {
  ok: boolean;
  message: string;
  report: QuarterlyReport | null;
}

/**
 * T8.3 — 분기 KSF 스냅샷 집계 + 도입 전/후 비교 리포트 조회. audit:read 필요(경영 리포트).
 * 도입일(adoptionDate)은 OperationParam 'adoption_date'에서, 없으면 분기 시작일을 사용.
 */
export async function getQuarterlyReport(quarter: string, adoptionDateArg?: string): Promise<QuarterlyReportResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'audit:read');
  } catch {
    return { ok: false, message: '리포트 조회 권한(audit:read)이 없습니다.', report: null };
  }
  if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
    return { ok: false, message: '분기 형식(예: 2026-Q2)이 올바르지 않습니다.', report: null };
  }

  const { start, end } = quarterRange(quarter);

  let adoptionDate = adoptionDateArg && /^\d{4}-\d{2}-\d{2}$/.test(adoptionDateArg) ? adoptionDateArg : undefined;
  if (!adoptionDate) {
    const param = await prisma.operationParam.findUnique({ where: { key: 'adoption_date' } });
    adoptionDate = param && /^\d{4}-\d{2}-\d{2}$/.test(param.value) ? param.value : start;
  }

  const rows = await prisma.ksfDailySnapshot.findMany({
    where: { date: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T00:00:00.000Z`) } },
    orderBy: { date: 'asc' },
  });

  const snapshots: SnapshotInput[] = rows.map((r) => ({
    date: iso(r.date),
    ksf1Punctuality: r.ksf1Punctuality,
    ksf5Unification: r.ksf5Unification,
    ksf6Adoption: r.ksf6Adoption,
  }));

  const report = buildQuarterlyReport(snapshots, adoptionDate, quarter);

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'QUARTERLY_REPORT_EXPORTED',
    table: 'KsfDailySnapshot',
    key: quarter,
    after: { before: report.before.count, after: report.after.count },
  });

  return { ok: true, message: '조회 완료', report };
}
