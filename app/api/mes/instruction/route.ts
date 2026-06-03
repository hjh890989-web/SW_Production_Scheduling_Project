import { NextResponse, type NextRequest } from 'next/server';
import { logAudit } from '@/lib/audit';
import { checkApiKey } from '@/lib/mes/result-mapping';
import { instructionSchema } from '@/lib/mes/retry-policy';
import { dispatchInstruction } from '@/lib/mes/instruction-service';

export const dynamic = 'force-dynamic';

/**
 * T9.4 작업지시 송신 (F-7.2, AC PM-2-3). 확정 스케줄을 MES로 송신.
 * 인증: x-mes-api-key. timeout/실패 시 재시도 큐 적재(AC T9.4-F1, AC ER-2-F1).
 */
export async function POST(req: NextRequest) {
  if (!checkApiKey(req.headers.get('x-mes-api-key'), process.env.MES_API_KEY)) {
    await logAudit({ action: 'MES_INSTRUCTION_UNAUTHORIZED', table: 'MesRetryQueue', reason: 'invalid api key' });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const parsed = instructionSchema.safeParse(body);
  if (!parsed.success) {
    console.warn('[MES] instruction validation failed', parsed.error.issues); // SEC: 내부 로그만, 응답엔 미노출
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 422 });
  }

  const result = await dispatchInstruction(parsed.data);
  // 송신 성공(200) 또는 재시도 큐 적재(202 Accepted)
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
