'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { loadWorkbook, workbookMatrix, workbookSheetNames, type Workbook } from '@/lib/etl/excel';
import { parseWeeklyPlan } from '@/lib/etl/weekly-plan-parser';
import { parseKdOrder, KD_SHEET_NAME } from '@/lib/etl/kd-order-parser';
import { parseMonthlyForecast } from '@/lib/etl/monthly-forecast-parser';
import { parseSalesForecast, monthFromFilename } from '@/lib/etl/sales-forecast-parser';
import { applySiliconeFilter, unmatchedCodes } from '@/lib/orders/silicone-filter';
import { applyPriorityRule } from '@/lib/orders/priority-rule';
import { createUnmatchedNotification } from '@/lib/orders/notifications';
import { detectSourceType, MAX_UPLOAD_BYTES } from '@/lib/orders/detect';
import type { ParseResult, SourceType } from '@/lib/orders/types';

export interface UploadResult {
  ok: boolean;
  message: string;
  sourceType?: SourceType;
  loaded?: number;
  superseded?: number;
  unmatched?: string[];
  rejected?: number;
  errors?: string[];
}

/** 다중 파일(3종 동시) 업로드 결과 — 파일별 UploadResult 묶음. */
export interface MultiUploadResult {
  ok: boolean;
  message: string;
  results: Array<UploadResult & { fileName: string }>;
}

type SessionLike = { user?: { id?: string | null; role?: string | null } } | null;

function parseByType(wb: Workbook, sourceType: SourceType, filename: string): ParseResult {
  const names = workbookSheetNames(wb);
  if (sourceType === 'weekly_plan') return parseWeeklyPlan(workbookMatrix(wb, names[0]));
  if (sourceType === 'kd') {
    if (!names.includes(KD_SHEET_NAME)) {
      return { rows: [], errors: [`'${KD_SHEET_NAME}' 시트가 없습니다.`] };
    }
    return parseKdOrder(workbookMatrix(wb, KD_SHEET_NAME));
  }
  // monthly_forecast — 두 레이아웃 분기.
  // '통합/수주정보' = M/D 날짜 헤더(r4) / '예상 매출 계획' = 주차 헤더(r8).
  const lower = filename.toLowerCase();
  if (lower.includes('통합') || lower.includes('수주정보')) {
    const monthlySheet = names.find((s) => s.includes('통합')) ?? names[0];
    return parseMonthlyForecast(workbookMatrix(wb, monthlySheet));
  }
  const month = monthFromFilename(filename);
  if (month === null) {
    return { rows: [], errors: ['예상 매출 계획 파일명에 월(예: 06월) 정보가 없습니다.'] };
  }
  return parseSalesForecast(workbookMatrix(wb, names[0]), month);
}

/**
 * 단일 파일 코어: 파싱 → 실리콘 필터 → 우선순위 → Order 적재 (T3.6 — AC SP-1-1·2).
 * revalidate는 호출부에서 1회 수행한다(다중 업로드 시 중복 방지).
 */
async function processOneFile(file: File, session: SessionLike): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: '파일이 50MB를 초과합니다.' };
  }

  const sourceType = detectSourceType(file.name);
  if (!sourceType) {
    return { ok: false, message: '파일 종류를 인식하지 못했습니다(주간/KD/통합 파일명 필요).' };
  }

  let wb: Workbook;
  try {
    wb = await loadWorkbook(await file.arrayBuffer());
  } catch {
    return { ok: false, message: '엑셀 파일을 읽을 수 없습니다(손상되었을 수 있습니다).', sourceType };
  }

  const parsed = parseByType(wb, sourceType, file.name);
  if (parsed.rows.length === 0) {
    return { ok: false, message: '적재할 행이 없습니다.', sourceType, errors: parsed.errors };
  }

  const filtered = await applySiliconeFilter(parsed.rows);
  const prioritized = applyPriorityRule(filtered.passed);
  const batchId = randomUUID();

  await prisma.$transaction(
    prioritized.map((r) =>
      prisma.order.create({
        data: {
          itemId: r.itemId as string,
          rawProductCode: r.rawProductCode,
          deliveryDate: new Date(`${r.deliveryDate}T00:00:00.000Z`),
          quantity: r.quantity,
          orderType: r.orderType,
          sourceType: r.sourceType,
          confidence: r.confidence,
          status: r.status,
          uploadBatchId: batchId,
        },
      }),
    ),
  );

  const codes = unmatchedCodes(filtered);
  if (codes.length > 0) await createUnmatchedNotification(codes, session?.user?.id ?? null);

  const loaded = prioritized.filter((r) => r.status === 'ACTIVE').length;
  const superseded = prioritized.length - loaded;

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'ORDERS_UPLOADED',
    table: 'Order',
    key: batchId,
    after: { sourceType, loaded, superseded, unmatched: codes.length, rejected: filtered.rejected.length },
  });

  return {
    ok: true,
    message: `적재 완료: ACTIVE ${loaded}건 (superseded ${superseded}, 미매칭 ${codes.length}, 비실리콘 ${filtered.rejected.length})`,
    sourceType,
    loaded,
    superseded,
    unmatched: codes,
    rejected: filtered.rejected.length,
    errors: parsed.errors,
  };
}

/**
 * 수주 엑셀 단일 업로드 (T3.6). 다중 업로드는 uploadOrdersMulti 사용.
 */
export async function uploadOrders(formData: FormData): Promise<UploadResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:upload');
  } catch {
    return { ok: false, message: '업로드 권한(order:upload)이 없습니다.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: '파일이 없습니다.' };

  const res = await processOneFile(file, session);
  if (res.ok) revalidatePath('/orders');
  return res;
}

/**
 * 수주 엑셀 다중 업로드 (3종 동시 드래그). 파일별로 종류 자동 감지·독립 적재하고
 * 결과를 묶어 반환한다. 각 파일은 단일 업로드와 동일한 의미(개별 batchId·우선순위).
 */
export async function uploadOrdersMulti(formData: FormData): Promise<MultiUploadResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'order:upload');
  } catch {
    return { ok: false, message: '업로드 권한(order:upload)이 없습니다.', results: [] };
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false, message: '파일이 없습니다.', results: [] };

  const results: MultiUploadResult['results'] = [];
  for (const file of files) {
    const res = await processOneFile(file, session);
    results.push({ ...res, fileName: file.name });
  }

  const okCount = results.filter((r) => r.ok).length;
  if (okCount > 0) revalidatePath('/orders');

  return {
    ok: okCount === files.length,
    message:
      okCount === files.length
        ? `적재 완료: ${okCount}개 파일 모두 처리`
        : `${files.length}개 중 ${okCount}개 적재 완료 (${files.length - okCount}개 실패)`,
    results,
  };
}
