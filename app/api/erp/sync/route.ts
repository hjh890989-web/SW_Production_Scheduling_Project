import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/audit';
import { erpApiKeyOk } from '@/lib/erp/sync-mapping';
import { runErpSync } from '@/lib/erp/sync-service';

export const dynamic = 'force-dynamic';

/**
 * T10.2 영림원 ERP 동기화 (F-1.1). POST — 내부/cron 호출. 인증: x-erp-api-key.
 * 품번·거래처 fetch → Item 마스터 변경분 upsert. ERP 다운이면 503 + 실패 audit + Admin 알림.
 */
export async function POST(req: NextRequest) {
  if (!erpApiKeyOk(req.headers.get('x-erp-api-key'), process.env.ERP_API_KEY)) {
    await logAudit({ action: 'ERP_SYNC_UNAUTHORIZED', table: 'Item', reason: 'invalid api key' });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const result = await runErpSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
