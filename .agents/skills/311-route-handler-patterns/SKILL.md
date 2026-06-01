---
name: 311-route-handler-patterns
description: Route Handler (REST API) 표준 골격·응답 envelope·CORS·웹훅 검증. 파일 경로 `app/api/**/route.ts` 작업 시 자동 발동.
---

# Route Handler Patterns (외부/REST API)

> **자동 발동 트리거** (좁게): `app/api/**/route.ts` 파일 작업 시.

CON-11 — Server Action이 기본, Route Handler는 **외부 시스템·표준 REST·파일 응답**이 필요할 때만.

---

## 1. Server Action vs Route Handler 결정

| 상황 | 선택 |
|---|---|
| 폼 submit, 클라이언트 컴포넌트에서 호출 | **Server Action** |
| 외부 webhook (Stripe, GitHub, 더존 ERP 알림 등) | Route Handler |
| Mobile 앱 / 외부 시스템이 호출 | Route Handler |
| CSV/PDF 파일 download | Route Handler |
| Cron (Vercel Cron) | Route Handler (`/api/cron/*`) |
| Server-Sent Events / Streaming | Route Handler |
| `Content-Type` 협상이 필요 | Route Handler |

---

## 2. 표준 골격 (이대로 복사)

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { apiError, isAppError } from '@/lib/errors'

// 동적 라우트 — 캐시하지 않음
export const dynamic = 'force-dynamic'

const PostInput = z.object({
  lotCode: z.string().min(1).max(50),
})

export async function POST(req: NextRequest) {
  try {
    // 1) 인증·인가
    const session = await requireRole(['ADMIN', 'OPERATOR'])

    // 2) 입력 파싱
    const body = await req.json()
    const data = PostInput.parse(body)

    // 3) 비즈니스 로직
    const lot = await prisma.lot.create({ data: { ...data, createdById: session.user.id } })

    // 4) 감사 로그
    await logAction({
      actor: `user-${session.user.id}`,
      action: 'CREATE',
      target: { type: 'Lot', id: lot.id },
      after: lot,
      ipAddress: req.headers.get('x-forwarded-for') ?? req.ip ?? null,
    })

    // 5) 응답 (envelope 표준)
    return NextResponse.json({ data: { id: lot.id } }, { status: 201 })
  } catch (err) {
    return apiError(err)  // 표준 에러 envelope 반환 (315-api-error-handling)
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OPERATOR', 'VIEWER'])
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100)

    const lots = await prisma.lot.findMany({ take: limit, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ data: lots })
  } catch (err) {
    return apiError(err)
  }
}
```

---

## 3. 응답 Envelope 표준

### 성공
```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "total": 123, "limit": 20, "offset": 0 } }
```

### 에러
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "입력값이 올바르지 않습니다.", "details": { ... } } }
```

HTTP status 매핑: `315-api-error-handling` 참조.

---

## 4. URL Params / Query

```ts
// 동적 세그먼트
// app/api/v1/lots/[id]/route.ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Next 15+: params is Promise
  // ...
}

// Query string
const url = new URL(req.url)
const status = url.searchParams.get('status')
const page = Number(url.searchParams.get('page') ?? 1)
```

---

## 5. 외부 Webhook 검증

```ts
// app/api/v1/webhooks/erp/route.ts
import { createHmac, timingSafeEqual } from 'crypto'

export async function POST(req: NextRequest) {
  // 1) Signature 검증 (HMAC)
  const signature = req.headers.get('x-erp-signature')
  if (!signature) return new NextResponse('Missing signature', { status: 401 })

  const body = await req.text()  // raw body 필요 (signature 계산용)
  const expected = createHmac('sha256', process.env.ERP_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  // 2) IP allowlist (선택)
  const ip = req.headers.get('x-forwarded-for') ?? req.ip
  if (!ALLOWED_ERP_IPS.has(ip ?? '')) {
    return new NextResponse('IP not allowed', { status: 403 })
  }

  // 3) 처리
  const payload = JSON.parse(body)
  // ... (idempotency_key로 중복 처리 방지)

  return NextResponse.json({ ok: true })
}

const ALLOWED_ERP_IPS = new Set<string>(['203.0.113.1', '203.0.113.2'])
```

---

## 6. 파일 응답 (CSV Export 등)

```ts
// app/api/v1/audit-logs/export/route.ts
export async function GET(req: NextRequest) {
  await requireRole(['CISO', 'ADMIN'])

  const logs = await prisma.auditLog.findMany({ /* ... */ })
  const csv = toCsv(logs)  // 직접 구현

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-${Date.now()}.csv"`,
    },
  })
}

// 대용량: ReadableStream
export async function GET2(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue('id,actor,action\n')
      const cursor = await prisma.auditLog.findMany({ take: 1000 })
      for (const log of cursor) {
        controller.enqueue(`${log.id},${log.actor},${log.action}\n`)
      }
      controller.close()
    }
  })
  return new NextResponse(stream, { headers: { 'Content-Type': 'text/csv' }})
}
```

---

## 7. CORS

기본은 same-origin. 외부 origin이 필요한 경우만 명시:

```ts
// app/api/v1/public/health/route.ts
const ALLOWED_ORIGIN = 'https://partner.example.com'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  })
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true }, {
    headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
  })
}
```

---

## 8. 동적 설정 옵션

```ts
export const dynamic = 'force-dynamic'    // 모든 요청 새로 (캐시 안 함)
export const dynamic = 'force-static'     // 빌드 타임 정적
export const revalidate = 60              // ISR — 60초마다 재생성
export const runtime = 'edge'             // Edge runtime (간단/빠름, 일부 API 제한)
export const runtime = 'nodejs'           // 기본 — Prisma 등 모두 가능
```

> **Prisma 사용 시 `runtime: 'edge'` 금지**. Node runtime 유지.

---

## 9. /api/cron/* 패턴 (Vercel Cron)

```ts
// app/api/cron/check-ai-health/route.ts
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Vercel Cron secret 검증
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await checkAIHealth()
  return NextResponse.json({ checked: true, mode: result.mode })
}
```

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/check-ai-health", "schedule": "*/15 * * * *" }
  ]
}
```

> 상세: `.agents/skills/317-background-jobs`

---

## 10. PR 체크리스트
- [ ] `dynamic = 'force-dynamic'` 명시 (캐시 의도가 없으면)
- [ ] 첫 줄 try/catch 또는 첫 비즈니스 줄 `requireRole`
- [ ] Zod parse
- [ ] 응답 envelope 표준 (`{ data }` or `{ error }`)
- [ ] HTTP status code 명시 (`{ status: 201 }`)
- [ ] mutation 후 `logAction`
- [ ] Webhook이면 signature + idempotency 검증
- [ ] Prisma 사용 시 `runtime` 비-edge

## See also
- `310-server-action-patterns`
- `312-rbac-guard`
- `313-audit-log-helper`
- `315-api-error-handling`
- `317-background-jobs` (Cron)
