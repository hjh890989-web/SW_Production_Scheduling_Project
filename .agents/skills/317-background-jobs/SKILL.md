---
name: 317-background-jobs
description: 백그라운드 잡(Vercel Cron, 폴링) 표준. AI 헬스 체크·ERP 5분 배치·대시보드 발행. `app/api/cron/**`, `vercel.json`, `lib/jobs/**` 또는 `cron|schedule|idempotency` 키워드 작업 시 자동.
---

# Background Jobs & Cron

> **자동 발동 트리거** (좁게): `app/api/cron/**` 파일, `vercel.json` 편집, `lib/jobs/**` 작업, 또는 `cron|schedule|idempotency` 키워드 사용 시.

REQ-FUNC-019 (ERP 5분 배치), CON-03 ② (AI 정확도 모니터 ≤5분 전환), 그 외 일간 대시보드 발행 등.

---

## 1. 옵션 비교

| 방식 | 장점 | 단점 | 적용 |
|---|---|---|---|
| **Vercel Cron** | 무료(Hobby: 2/일, Pro: 무제한), Next.js 통합 | 최단 1분, 인스턴스 분산 | **MVP 기본** |
| **Supabase Edge Functions + pg_cron** | DB 트리거 통합, 무료 | Deno 환경, 학습 곡선 | Phase 2 선택 |
| **External (GitHub Actions schedule)** | 무료 무제한 | 의존성↑ | 비추천 |
| **Upstash QStash** | 강력한 큐 + 분산 락 | 유료 (무료 500 msg/일) | Phase 2 |

**MVP**: Vercel Cron + In-memory state. Phase 2에서 분산 필요 시 QStash/Upstash 검토.

---

## 2. Vercel Cron 표준 패턴

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/check-ai-health",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/erp-sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/daily-dashboard",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/archive-old-audit-logs",
      "schedule": "0 3 1 * *"
    }
  ]
}
```

> Vercel Hobby Tier 한도: 2 cron jobs. 초과 시 Pro 전환 또는 통합.

### Cron Route Handler 골격

```ts
// app/api/cron/check-ai-health/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { checkAIHealth } from '@/lib/jobs/ai-health'
import { logAction, actor } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // 1) Vercel Cron secret 검증
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2) Idempotency — 5분 내 중복 실행 방지
  const key = `cron:ai-health:${Math.floor(Date.now() / (5 * 60_000))}`
  const existing = await prisma.systemJob.findUnique({ where: { idempotencyKey: key }})
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'already_run', key })
  }

  // 3) 작업 실행
  const startedAt = new Date()
  const job = await prisma.systemJob.create({
    data: { idempotencyKey: key, name: 'check-ai-health', status: 'RUNNING', startedAt },
  })

  try {
    const result = await checkAIHealth()

    await prisma.systemJob.update({
      where: { id: job.id },
      data: { status: 'SUCCESS', finishedAt: new Date(), result: result as any },
    })

    await logAction({
      actor: actor.system('check-ai-health'),
      action: 'CREATE',
      target: { type: 'SystemJob', id: job.id },
      after: { mode: result.mode, accuracy: result.accuracy },
    })

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    await prisma.systemJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: String(err) },
    })

    // 실패 알림 — Sentry / Slack (Phase 2)
    console.error('[cron:check-ai-health]', err)
    return NextResponse.json({ error: { code: 'JOB_FAILED', message: String(err) }}, { status: 500 })
  }
}
```

---

## 3. `system_jobs` 테이블 (이력)

```prisma
model SystemJob {
  id              String    @id @default(cuid())
  idempotencyKey  String    @unique
  name            String                                          // 'check-ai-health' 등
  status          String                                          // 'RUNNING' | 'SUCCESS' | 'FAILED'
  startedAt       DateTime  @default(now())
  finishedAt      DateTime?
  result          Json?
  error           String?

  @@index([name, startedAt])
  @@map("system_jobs")
}
```

---

## 4. 잡 구현 예시

### AI 정확도 모니터 (`lib/jobs/ai-health.ts`)
```ts
import { prisma } from '@/lib/prisma'

const ACCURACY_THRESHOLD = 0.7
const WINDOW_MINUTES = 30

export async function checkAIHealth() {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000)
  const suggestions = await prisma.aiSuggestion.findMany({
    where: { createdAt: { gte: since }, status: { in: ['APPROVED', 'REJECTED'] }},
  })

  if (suggestions.length < 3) return { mode: 'AUTO' as const, accuracy: null, sample: suggestions.length }

  const approved = suggestions.filter(s => s.status === 'APPROVED').length
  const accuracy = approved / suggestions.length

  if (accuracy < ACCURACY_THRESHOLD) {
    await prisma.systemSetting.upsert({
      where: { key: 'ai_mode' },
      update: { value: 'MANUAL', updatedAt: new Date() },
      create: { key: 'ai_mode', value: 'MANUAL' },
    })
    // 사용자 알림 (이메일/in-app)
    return { mode: 'MANUAL' as const, accuracy, sample: suggestions.length }
  }

  return { mode: 'AUTO' as const, accuracy, sample: suggestions.length }
}
```

### ERP 5분 배치 (`lib/jobs/erp-sync.ts`)
```ts
export async function syncErp() {
  const lastSync = await prisma.systemSetting.findUnique({ where: { key: 'last_erp_sync' }})
  const since = lastSync ? new Date(lastSync.value) : new Date(Date.now() - 24 * 3600_000)

  // MVP: Mock ERP에서 읽기. PROD: erpPrisma (Read-Only)
  const items = await prisma.erpInventory.findMany({ where: { updatedAt: { gte: since }}, take: 1000 })

  for (const item of items) {
    await prisma.inventorySnapshot.upsert({
      where: { erpItemCode: item.itemCode },
      create: { /* ... */ },
      update: { /* ... */, syncedAt: new Date() },
    })
  }

  await prisma.systemSetting.upsert({
    where: { key: 'last_erp_sync' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_erp_sync', value: new Date().toISOString() },
  })

  return { synced: items.length }
}
```

---

## 5. Idempotency 키 패턴

| 시간 윈도우 | 키 패턴 | 의미 |
|---|---|---|
| 5분 윈도우 | `cron:<name>:${Math.floor(Date.now() / 300_000)}` | 5분에 1회만 |
| 일간 | `cron:<name>:${new Date().toISOString().slice(0,10)}` | 하루 1회만 |
| 월간 | `cron:<name>:${new Date().toISOString().slice(0,7)}` | 한 달 1회만 |

> Vercel Cron은 같은 시각에 여러 인스턴스에서 트리거되지 않지만, **수동 재시도/장애 회복 시 중복 실행** 가능. Idempotency 필수.

---

## 6. In-memory Queue의 한계

`lib/ai/queue.ts`는 **단일 Vercel 인스턴스 가정**. Cron으로 호출된 함수도 별도 인스턴스에서 실행되므로 큐 상태 공유 안 됨.

- **MVP 임시 해결**: 큐를 사용하는 작업은 사용자 요청 흐름에만 (cron에서 AI 호출 시 직접 호출 + 자체 throttle)
- **Phase 2 정식 해결**: Upstash Redis로 큐·상태 분산

---

## 7. 실패 알림 (MVP)

```ts
// lib/jobs/notify.ts
export async function notifyOps(message: string) {
  // MVP: console.error + audit_log
  console.error('[ops]', message)
  await logAction({
    actor: actor.system('job-failure-notifier'),
    action: 'CREATE',
    target: { type: 'Alert', id: Date.now().toString() },
    after: { message },
  })
  // Phase 2: Slack webhook, 이메일, SMS
}
```

---

## 8. 로컬 테스트

Vercel CLI:
```bash
vercel dev   # 로컬에서 cron 미발동
# 수동 호출
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-ai-health
```

또는 vitest:
```ts
import { GET } from '@/app/api/cron/check-ai-health/route'

it('CRON_SECRET 없으면 401', async () => {
  const req = new NextRequest('http://x/api/cron/check-ai-health')
  const res = await GET(req)
  expect(res.status).toBe(401)
})
```

---

## 9. PR 체크리스트
- [ ] `vercel.json` crons 추가/수정
- [ ] `/api/cron/*` 경로에 CRON_SECRET 검증
- [ ] Idempotency 키로 중복 실행 방지
- [ ] `SystemJob` 테이블에 실행 이력 기록
- [ ] 실패 시 `notifyOps` 호출
- [ ] runtime = nodejs
- [ ] AI 호출이 있다면 큐 우회 또는 직접 throttle (cron은 단일 인스턴스 가정 어려움)

## See also
- `311-route-handler-patterns` — `/api/cron/*` 패턴
- `313-audit-log-helper` — 시스템 actor
- `302-gemini-throttle` — In-memory 큐 한계
