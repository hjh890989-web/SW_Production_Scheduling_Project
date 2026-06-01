---
name: 319-user-rate-limiting
description: 사용자/IP별 API 호출 제한 (남용 방어). 로그인 brute-force, API 폭주 방어. `lib/rate-limit.ts`, `Ratelimit|rateLimit` 식별자 작업 시 자동.
---

# User-side Rate Limiting

> **자동 발동 트리거** (좁게): `lib/rate-limit.ts` 파일, `Ratelimit|rateLimit|tooManyRequests` 식별자 작업 시.

Gemini 큐(`302-gemini-throttle`)는 **외부 API에 대한 우리 측 송신 한도**. 본 skill은 **사용자가 우리 API를 호출하는 한도** (인증 brute-force, 폼 폭주 방어).

---

## 1. 시나리오별 한도

| 시나리오 | 한도 | 식별자 | 비고 |
|---|---|---|---|
| 로그인 시도 | 5회 / 15분 | IP + email | brute-force 방어 |
| 회원가입 | 3회 / 1시간 | IP | 봇 방어 |
| 비밀번호 리셋 | 3회 / 1시간 | email | 스팸 방어 |
| 일반 mutation Server Action | 100회 / 분 | user.id | 폭주 방어 |
| 일반 read Route Handler | 600회 / 분 | user.id | 캐시로 완화 가능 |
| Webhook 수신 | 60회 / 분 | source IP | 무한 루프 방어 |
| 파일 업로드 | 10회 / 시간 | user.id | 스토리지 비용 방어 |
| **AI 호출 (사용자별)** | Gemini 큐가 처리 | — | PoC 후 추가 검토 |

---

## 2. 도입 전략

### MVP (현재 — 단일 인스턴스 가정)
**In-memory + 단일 시도 카운터**. 충분한 보호.

```ts
// lib/rate-limit.ts
const buckets = new Map<string, { count: number; resetAt: number }>()

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number; retryAfterSec?: number }> {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }

  bucket.count++
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }
  return { ok: true, remaining: limit - bucket.count }
}

// 메모리 청소 (매 5분)
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt < now) buckets.delete(k)
  }
}, 5 * 60_000)
```

**한계**: Vercel 인스턴스 분산 시 각 인스턴스가 별도 카운터를 가져 한도 우회 가능. PoC 트래픽엔 충분.

### Phase 2 (Upstash Redis 도입 시점)
**`@upstash/ratelimit`** 사용. 분산 카운터.

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const loginLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:login',
})

export const apiLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'rl:api',
})
```

> **Upstash 도입 시점** (Q3 결정): A10(본 skill) 도입 시 동시에. PoC 트래픽 ≤3명 / 동시에 단일 인스턴스 가정 가능한 동안엔 In-memory 유지.

---

## 3. 사용 패턴

### 로그인 시도 (`auth.ts`의 `authorize` 내부)
```ts
import { rateLimit } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

async authorize(credentials, req) {
  const ip = req?.headers?.get('x-forwarded-for') ?? 'unknown'
  const limited = await rateLimit(`login:${ip}:${credentials.email}`, 5, 15 * 60_000)
  if (!limited.ok) {
    throw new RateLimitError(limited.retryAfterSec)
  }
  // ... 검증 로직
}
```

### Server Action
```ts
'use server'
export async function postComment(formData: FormData) {
  const session = await requireRole(['OPERATOR', 'ADMIN'])
  const limited = await rateLimit(`comment:${session.user.id}`, 30, 60_000)
  if (!limited.ok) {
    return { ok: false, error: { code: 'RATE_LIMIT', message: '댓글은 분당 30회까지 가능합니다.' }} as const
  }
  // ...
}
```

### Route Handler
```ts
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['OPERATOR'])
    const limited = await rateLimit(`api:${session.user.id}`, 100, 60_000)
    if (!limited.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: '요청이 너무 많습니다.' }},
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec ?? 60) }}
      )
    }
    // ...
  } catch (err) {
    return apiError(err)
  }
}
```

---

## 4. 화이트리스트 (선택)

```ts
const WHITELIST_IPS = new Set([process.env.ADMIN_IP, process.env.TEST_IP].filter(Boolean))

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const ip = key.split(':').find(p => p.includes('.'))   // 추출
  if (ip && WHITELIST_IPS.has(ip)) return { ok: true, remaining: Infinity }
  // ... 기존 로직
}
```

---

## 5. 응답 헤더 (표준 준수)

| Header | 값 | 의미 |
|---|---|---|
| `X-RateLimit-Limit` | 100 | 윈도우당 한도 |
| `X-RateLimit-Remaining` | 42 | 남은 호출 수 |
| `X-RateLimit-Reset` | 1715920800 | UNIX timestamp (리셋 시각) |
| `Retry-After` | 60 | 429 시 — 초 단위 |

```ts
const headers = new Headers({
  'X-RateLimit-Limit': String(limit),
  'X-RateLimit-Remaining': String(limited.remaining),
})
if (!limited.ok) headers.set('Retry-After', String(limited.retryAfterSec ?? 60))
return new NextResponse(/* ... */, { headers })
```

---

## 6. brute-force 탐지 + 잠금

연속 실패가 임계치를 넘으면 **계정 잠금** (rate limit과 별도):

```ts
// auth.ts authorize 내부
if (failedCount >= 10) {
  await prisma.user.update({
    where: { email },
    data: { lockedUntil: new Date(Date.now() + 30 * 60_000) },
  })
  await logAction({
    actor: `anonymous-${ip}`,
    action: 'LOGIN_FAILED',
    target: { type: 'User', id: user.id },
    metadata: { reason: 'ACCOUNT_LOCKED', failedCount },
  })
  // CISO 알림
  await notifyOps(`🚨 계정 잠금: ${email} (${ip})`)
  return null
}
```

---

## 7. 모니터링

- `audit_log`의 `LOGIN_FAILED` / `RATE_LIMIT` 액션을 일간 집계
- Phase 2: Sentry 대시보드 + 알림

---

## 8. PR 체크리스트
- [ ] 신규 인증/mutation 엔드포인트에 rate limit 적용
- [ ] 적절한 한도·윈도우 (시나리오별 표 참조)
- [ ] 키에 식별자(user.id 또는 IP) 포함
- [ ] 429 응답 시 `Retry-After` 헤더
- [ ] 화이트리스트(필요시)
- [ ] In-memory → 분산(Upstash) 전환 트리거: 인스턴스 분산 관측, PoC 동시 사용자 ≥5명

## See also
- `314-nextauth-v5-setup` — 로그인 시도 brute-force 방어
- `315-api-error-handling` — `RateLimitError` (429 envelope)
- `302-gemini-throttle` — 외부 API 송신 한도 (다른 방향)
