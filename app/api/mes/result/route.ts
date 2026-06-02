import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import {
  mesResultBatchSchema,
  checkApiKey,
  dedupeByExternalId,
  toProductionResultData,
} from '@/lib/mes/result-mapping';
import { applyInventoryChange } from '@/lib/inventory/inventory-service';
import { productionDelta } from '@/lib/inventory/delta';

export const dynamic = 'force-dynamic';

/**
 * T9.2 MES 작업실적 수신 (F-7.1, AC MR-1-3). POST 본문 { results: [...] }.
 * 인증: x-mes-api-key 헤더 vs env MES_API_KEY. 멱등성: externalId @unique.
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-mes-api-key');
  if (!checkApiKey(apiKey, process.env.MES_API_KEY)) {
    await logAudit({
      action: 'MES_RESULT_UNAUTHORIZED',
      table: 'ProductionResult',
      reason: 'invalid or missing x-mes-api-key',
    });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const parsed = mesResultBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'validation', issues: parsed.error.issues }, { status: 422 });
  }

  const records = dedupeByExternalId(parsed.data.results);
  let inserted = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const record of records) {
    const item = await prisma.item.findUnique({ where: { productCode: record.productCode } });
    if (!item) {
      unmatched.push(record.productCode);
      continue;
    }
    // 멱등: 이미 있는 externalId는 건너뜀
    const exists = await prisma.productionResult.findUnique({ where: { externalId: record.externalId } });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.productionResult.create({ data: toProductionResultData(record, item.id) });
    // T9.3: 생산 실적 적재 → 재고 자동 증가(트랜잭션·음수 가드)
    await applyInventoryChange(item.id, productionDelta(record.quantity));
    inserted += 1;
  }

  await logAudit({
    action: 'MES_RESULT_RECEIVED',
    table: 'ProductionResult',
    after: { inserted, skipped, unmatched: unmatched.length },
  });

  return NextResponse.json({ ok: true, inserted, skipped, unmatched });
}
