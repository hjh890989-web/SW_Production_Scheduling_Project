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

function parseByType(wb: Workbook, sourceType: SourceType): ParseResult {
  const names = workbookSheetNames(wb);
  if (sourceType === 'weekly_plan') return parseWeeklyPlan(workbookMatrix(wb, names[0]));
  if (sourceType === 'kd') {
    if (!names.includes(KD_SHEET_NAME)) {
      return { rows: [], errors: [`'${KD_SHEET_NAME}' 시트가 없습니다.`] };
    }
    return parseKdOrder(workbookMatrix(wb, KD_SHEET_NAME));
  }
  const monthlySheet = names.find((s) => s.includes('통합')) ?? names[0];
  return parseMonthlyForecast(workbookMatrix(wb, monthlySheet));
}

/**
 * 수주 엑셀 업로드 → 파싱 → 실리콘 필터 → 우선순위 → Order 적재 (T3.6 — AC SP-1-1·2).
 * 미매칭 품번은 적재하지 않고 알림 대상으로 반환.
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
    return { ok: false, message: '엑셀 파일을 읽을 수 없습니다(손상되었을 수 있습니다).' };
  }

  const parsed = parseByType(wb, sourceType);
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

  revalidatePath('/orders');
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
