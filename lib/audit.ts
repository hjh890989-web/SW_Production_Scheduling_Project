import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

/**
 * 모든 변경 자동 audit 기록 (T1.6 — 부록 G.4, 5년 보존 R-13).
 * T1.1/T1.3/T1.5의 inline 기록을 본 헬퍼로 일반화한다.
 */
export interface AuditInput {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  table?: string | null;
  key?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  /** 명시하지 않으면 요청 헤더에서 자동 추출 시도. */
  ipAddress?: string | null;
  sessionId?: string | null;
  userAgent?: string | null;
}

/** before/after를 문자열로 직렬화 (객체는 JSON.stringify). */
export function serializeAuditValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** 요청 헤더에서 IP·UA 추출 (요청 스코프 밖이면 null). */
function requestMeta(): { ipAddress: string | null; userAgent: string | null } {
  try {
    const h = headers();
    return {
      ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
      userAgent: h.get('user-agent') ?? null,
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * AuditLog 1건 기록. DB 실패 시에도 throw하지 않고 stdout으로 fallback (AC T1.6-F1 — loss 방지).
 */
export async function logAudit(input: AuditInput): Promise<void> {
  const meta = requestMeta();
  const data = {
    userId: input.userId ?? null,
    userRole: input.userRole ?? null,
    action: input.action,
    targetTable: input.table ?? null,
    targetKey: input.key ?? null,
    beforeValue: serializeAuditValue(input.before),
    afterValue: serializeAuditValue(input.after),
    reason: input.reason ?? null,
    ipAddress: input.ipAddress ?? meta.ipAddress,
    sessionId: input.sessionId ?? null,
    userAgent: input.userAgent ?? meta.userAgent,
  };

  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    // fallback: 감사 손실 방지를 위해 stdout에 전체 페이로드 출력
    console.error('[audit] logAudit fallback (DB write failed):', JSON.stringify(data), err);
  }
}
