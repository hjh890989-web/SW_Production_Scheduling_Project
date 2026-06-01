---
name: 313-audit-log-helper
description: 감사 로그(audit_log) 헬퍼·표기 표준·retention. `lib/audit.ts`, `logAction` 식별자 또는 mutation 후 audit 기록 작업 시 자동.
---

# Audit Log Helper (R4 표준)

> **자동 발동 트리거** (좁게): `lib/audit.ts` 파일, `logAction|auditLog\.create` 식별자, 또는 mutation 코드(`prisma.\w+\.(create|update|delete)`) 직후 작업 시.

R4 — 모든 mutation 후 `audit_log` 기록. 산발적 `prisma.auditLog.create()` 반복을 헬퍼화하여 일관성·DRY 확보.

---

## 1. Prisma 모델 (`prisma/schema.prisma`)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actor       String   // 'user-<id>' | 'ai-<model>-<version>' | 'system-<job>'
  action      String   // AuditAction enum 문자열
  targetType  String   // 'Lot' | 'AuditReport' | 'AiSuggestion' | ...
  targetId    String
  before      Json?
  after       Json?
  confidence  Float?   // AI 액션에만
  ipAddress   String?
  userAgent   String?
  metadata    Json?    // 자유 형식 (correlationId 등)
  createdAt   DateTime @default(now())

  @@index([actor, createdAt])
  @@index([targetType, targetId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 2. 헬퍼 (`lib/audit.ts`)

```ts
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export const AUDIT_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE',
  'APPROVE', 'REJECT', 'AUTO_FLAG',
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'ERP_SYNC', 'EXPORT', 'IMPORT',
  'PERMISSION_CHANGE',
] as const
export type AuditAction = typeof AUDIT_ACTIONS[number]

export type LogActionInput = {
  actor: string                                       // 'user-<id>' | 'ai-<model>' | 'system-<job>'
  action: AuditAction
  target: { type: string; id: string }
  before?: unknown
  after?: unknown
  confidence?: number                                 // AI 액션 시
  metadata?: Record<string, unknown>
  /** Route Handler에서는 req.ip / x-forwarded-for 직접 전달 */
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * 표준 audit_log 기록.
 * - PII 마스킹 자동 적용 (before/after 내부 name/phone/email)
 * - Server Component / Server Action에서는 headers()로 자동 ip/ua 추출
 */
export async function logAction(input: LogActionInput): Promise<void> {
  let ip = input.ipAddress
  let ua = input.userAgent

  if (ip === undefined || ua === undefined) {
    try {
      const h = await headers()
      ip ??= h.get('x-forwarded-for') ?? h.get('x-real-ip')
      ua ??= h.get('user-agent')
    } catch {
      // Route Handler 외부에서 호출 시 headers() 사용 불가 — 무시
    }
  }

  await prisma.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      targetType: input.target.type,
      targetId: input.target.id,
      before: maskPII(input.before) as any,
      after: maskPII(input.after) as any,
      confidence: input.confidence ?? null,
      metadata: (input.metadata ?? null) as any,
      ipAddress: ip ?? null,
      userAgent: ua ?? null,
    },
  })
}

/** 사용자/AI/시스템 actor 식별자 빌더 */
export const actor = {
  user: (id: string) => `user-${id}`,
  ai: (model: string) => `ai-${model}`,
  system: (job: string) => `system-${job}`,
}

const PII_KEYS = new Set(['name', 'phone', 'email', 'ssn', 'password', 'token', 'authorization'])

function maskPII(val: unknown): unknown {
  if (val == null || typeof val !== 'object') return val
  if (Array.isArray(val)) return val.map(maskPII)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (PII_KEYS.has(k.toLowerCase()) && typeof v === 'string') {
      out[k] = v.length > 2 ? v[0] + '*'.repeat(v.length - 1) : '*'
    } else {
      out[k] = maskPII(v)
    }
  }
  return out
}
```

---

## 3. 사용 패턴

### Server Action에서 (가장 흔함)
```ts
'use server'
import { logAction, actor } from '@/lib/audit'

export async function createLot(formData: FormData) {
  const session = await requireRole(['ADMIN', 'OPERATOR'])
  const data = LotSchema.parse(Object.fromEntries(formData))

  const lot = await prisma.lot.create({ data })

  await logAction({
    actor: actor.user(session.user.id),
    action: 'CREATE',
    target: { type: 'Lot', id: lot.id },
    after: lot,
  })

  return { ok: true, data: { id: lot.id } }
}
```

### AI 결정 기록
```ts
const suggestion = await prisma.aiSuggestion.create({ data: { /* ... */ status: 'PENDING_APPROVAL' }})

await logAction({
  actor: actor.ai('gemini-1.5-flash@2026-05'),
  action: 'AUTO_FLAG',
  target: { type: 'AiSuggestion', id: suggestion.id },
  after: suggestion,
  confidence: explanation.confidence,
})
```

### 시스템 잡
```ts
await logAction({
  actor: actor.system('erp-sync-batch'),
  action: 'ERP_SYNC',
  target: { type: 'ErpInventory', id: 'batch-' + Date.now() },
  after: { count: items.length, durationMs },
})
```

### 트랜잭션 내부
```ts
await prisma.$transaction(async (tx) => {
  const lot = await tx.lot.create({ data })
  await tx.auditLog.create({                            // tx 사용 (헬퍼 우회)
    data: {
      actor: actor.user(session.user.id),
      action: 'CREATE',
      targetType: 'Lot',
      targetId: lot.id,
      after: lot as any,
    },
  })
})
```

> 트랜잭션 내부는 헬퍼 대신 `tx.auditLog.create()` 직접 호출 (헬퍼는 별도 connection 사용). PII 마스킹이 필요하면 `maskPII()` 직접 호출.

---

## 4. Actor 표기 표준

| 패턴 | 예시 | 사용처 |
|---|---|---|
| `user-<id>` | `user-clx1234abc` | 사용자 행위 |
| `ai-<model>-<version>` | `ai-gemini-1.5-flash@2026-05` | AI 결정 |
| `system-<job>` | `system-erp-sync-batch`, `system-ai-health-monitor` | 백그라운드 잡 |
| `anonymous-<ip>` | `anonymous-203.0.113.5` | 로그인 시도 등 |

---

## 5. Action 표준 분류

| Action | 사용 시점 |
|---|---|
| `CREATE` / `UPDATE` / `DELETE` | CRUD |
| `APPROVE` / `REJECT` | HITL 승인 (`PENDING_APPROVAL` 전환) |
| `AUTO_FLAG` | AI가 의심 항목 자동 표시 |
| `LOGIN` / `LOGOUT` | 인증 |
| `LOGIN_FAILED` | 인증 실패 (brute-force 추적) |
| `ERP_SYNC` | ERP → FactoryAI 동기화 |
| `EXPORT` / `IMPORT` | 대량 데이터 입출 |
| `PERMISSION_CHANGE` | RBAC 변경 (특히 중요) |

---

## 6. Retention 정책

| 기간 | 동작 |
|---|---|
| 0~90일 | `audit_logs` 테이블 (hot) — 조회 빈번 |
| 90일~1년 | 동일 테이블 유지 (Supabase 500MB 한도 모니터링) |
| 1년+ | 매월 1일 cron으로 `audit_logs_archive` 테이블 이전 또는 S3 CSV export (Phase 2) |

### Archive 스크립트 골격
```ts
// scripts/archive-old-audit-logs.ts
const cutoff = new Date(Date.now() - 365 * 24 * 3600 * 1000)
const old = await prisma.auditLog.findMany({ where: { createdAt: { lt: cutoff }}})
await s3Upload(`audit/${cutoff.toISOString().slice(0,7)}.csv`, toCsv(old))
await prisma.auditLog.deleteMany({ where: { id: { in: old.map(o => o.id) }}})
```

---

## 7. Export (CISO 감사 대응)

```ts
// app/api/v1/audit-logs/export/route.ts
export async function GET(req: NextRequest) {
  await requireRole(['CISO', 'ADMIN'])
  const url = new URL(req.url)
  const from = new Date(url.searchParams.get('from') ?? '2026-01-01')
  const to = new Date(url.searchParams.get('to') ?? new Date())

  const logs = await prisma.auditLog.findMany({
    where: { createdAt: { gte: from, lte: to }},
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  // CISO export 자체도 audit_log에 기록 (감사의 감사)
  const session = await auth()
  await logAction({
    actor: actor.user(session!.user.id),
    action: 'EXPORT',
    target: { type: 'AuditLog', id: 'batch' },
    metadata: { from: from.toISOString(), to: to.toISOString(), count: logs.length },
  })

  return new NextResponse(toCsv(logs), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${Date.now()}.csv"`,
    },
  })
}
```

---

## 8. PR 체크리스트
- [ ] mutation 후 `logAction(...)` 호출 (헬퍼 사용)
- [ ] AI 액션은 `confidence` 포함
- [ ] 트랜잭션 내부는 `tx.auditLog.create()` 직접 사용
- [ ] `actor` 표기 표준 준수 (`actor.user/ai/system`)
- [ ] `action`은 정해진 enum 문자열만
- [ ] PII는 `maskPII()` 자동 처리 — 직접 평문 저장 금지
- [ ] export 액션 자체도 audit 기록 (감사의 감사)

## See also
- `310-server-action-patterns` §1 표준 골격
- `312-rbac-guard` — 인증 이벤트도 기록
- `.agents/rules/004-hitl-and-security.md` §1 원칙 ④
