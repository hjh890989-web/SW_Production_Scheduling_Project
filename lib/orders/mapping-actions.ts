'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { SOURCE_TYPES, type SourceType } from '@/lib/orders/types';
import { DEFAULT_MAPPING_RULES, parseColumnMapping, type MappingRule } from '@/lib/orders/mapping-defaults';
import { detectSourceType } from '@/lib/orders/detect';
import { applySiliconeFilter, unmatchedCodes } from '@/lib/orders/silicone-filter';
import { loadWorkbook, workbookMatrix, workbookSheetNames } from '@/lib/etl/excel';
import { parseWeeklyPlan } from '@/lib/etl/weekly-plan-parser';
import { parseKdOrder, KD_SHEET_NAME } from '@/lib/etl/kd-order-parser';
import { parseMonthlyForecast } from '@/lib/etl/monthly-forecast-parser';

export interface MappingActionResult {
  ok: boolean;
  message: string;
}

/** 3 sourceType 매핑 룰을 DB(있으면) 또는 기본값으로 반환. */
export async function getMappingRules(): Promise<MappingRule[]> {
  const session = await auth(); // SEC: 노출된 액션 — master:read 가드
  requirePermission(session?.user, 'master:read');
  const stored = await prisma.excelMappingRule.findMany();
  const byType = new Map(stored.map((s) => [s.sourceType, s]));
  return SOURCE_TYPES.map((st) => {
    const s = byType.get(st);
    if (!s) return DEFAULT_MAPPING_RULES[st];
    return {
      sourceType: st,
      sheetName: s.sheetName,
      headerRow: s.headerRow,
      dataStartRow: s.dataStartRow,
      columnMapping: s.columnMapping as Record<string, number>,
    };
  });
}

/** 매핑 룰 저장 (T3.7 — AC T3.7-1, F1). master:write + Zod 검증 + AuditLog. */
export async function updateMappingRule(
  sourceType: string,
  sheetName: string,
  headerRow: number,
  dataStartRow: number,
  columnMappingJson: string,
): Promise<MappingActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }
  if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    return { ok: false, message: `정의되지 않은 sourceType: ${sourceType}` };
  }
  if (!Number.isInteger(headerRow) || !Number.isInteger(dataStartRow) || headerRow < 1 || dataStartRow < 1) {
    return { ok: false, message: '헤더/데이터 시작 행은 1 이상의 정수여야 합니다.' };
  }
  const mapping = parseColumnMapping(columnMappingJson);
  if (!mapping.ok) return { ok: false, message: mapping.error };

  const before = await prisma.excelMappingRule.findUnique({ where: { sourceType } });
  await prisma.excelMappingRule.upsert({
    where: { sourceType },
    update: { sheetName: sheetName || null, headerRow, dataStartRow, columnMapping: mapping.value },
    create: { sourceType, sheetName: sheetName || null, headerRow, dataStartRow, columnMapping: mapping.value },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'MAPPING_RULE_UPDATED',
    table: 'ExcelMappingRule',
    key: sourceType,
    before: before ? { headerRow: before.headerRow, dataStartRow: before.dataStartRow } : null,
    after: { headerRow, dataStartRow },
  });
  revalidatePath('/master/mapping');
  return { ok: true, message: '매핑 룰을 저장했습니다.' };
}

export interface SimulateResult {
  ok: boolean;
  message: string;
  sourceType?: SourceType;
  parsed?: number;
  passed?: number;
  unmatched?: number;
}

/** 매핑 시뮬레이션 (T3.7 — AC T3.7-2): 적재 없이 파싱/매핑 결과만 미리보기. */
export async function simulateUpload(formData: FormData): Promise<SimulateResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:read');
  } catch {
    return { ok: false, message: '조회 권한(order:read)이 없습니다.' };
  }
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: '파일이 없습니다.' };
  const sourceType = detectSourceType(file.name);
  if (!sourceType) return { ok: false, message: '파일 종류를 인식하지 못했습니다.' };

  const wb = await loadWorkbook(await file.arrayBuffer());
  const names = workbookSheetNames(wb);
  const parsed =
    sourceType === 'weekly_plan'
      ? parseWeeklyPlan(workbookMatrix(wb, names[0]))
      : sourceType === 'kd'
        ? parseKdOrder(workbookMatrix(wb, KD_SHEET_NAME))
        : parseMonthlyForecast(workbookMatrix(wb, names.find((s) => s.includes('통합')) ?? names[0]));

  const filtered = await applySiliconeFilter(parsed.rows);
  return {
    ok: true,
    message: '시뮬레이션 완료(적재 없음).',
    sourceType,
    parsed: parsed.rows.length,
    passed: filtered.passed.length,
    unmatched: unmatchedCodes(filtered).length,
  };
}
