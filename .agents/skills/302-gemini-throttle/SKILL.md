---
name: 302-gemini-throttle
description: Gemini API 호출 코드 작성 시 자동 발동. CON-12·ASM-10 강제 — 직접 호출 금지, 모든 호출은 lib/ai/queue.ts의 In-memory Queue 경유, ≤12 RPM 안전마진, Exponential Backoff.
---

# Gemini Rate Limit Guard (CON-12)

> **자동 발동 트리거**: `generateText`, `generateObject`, `streamText`, `embed`, `@ai-sdk/google`, `gemini` 키워드 포함 코드 작성 시.

## 제약

| 항목 | 값 |
|---|---|
| Free Tier 한도 (Gemini 1.5 Flash) | 15 RPM, 1500 RPD |
| 안전 마진 적용 후 최대 | **12 RPM** (5초/호출 간격) |
| 동시 호출 수 | 1 (직렬 처리) |
| 최대 대기 시간 | 60초 (사용자에게 진행률 표시) |
| 재시도 | 지수 백오프, 최대 3회 |

---

## 강제 패턴

### ❌ 금지 — 직접 호출
```ts
// SDK 직접 호출 → Rate Limit 위반 위험
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

const result = await generateText({           // ❌ 큐 우회
  model: google('gemini-1.5-flash'),
  prompt: '...',
})
```

### ✅ 허용 — 큐 경유
```ts
import { aiQueue } from '@/lib/ai/queue'

const result = await aiQueue.enqueue(() =>
  generateText({
    model: google('gemini-1.5-flash'),
    prompt: '...',
  })
)
```

또는 `lib/ai/text.ts`의 헬퍼 사용:
```ts
import { summarizeKorean } from '@/lib/ai/text'
const summary = await summarizeKorean(input)
```

---

## 큐 구현 (`lib/ai/queue.ts`)

```ts
type QueuedJob<T> = {
  fn: () => Promise<T>
  resolve: (v: T) => void
  reject: (e: unknown) => void
}

class AIQueue {
  private queue: QueuedJob<any>[] = []
  private inflight = 0
  private readonly maxConcurrent = 1
  private lastCallAt = 0
  private readonly minIntervalMs = 5_000  // 12 RPM = 5s 간격

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.tick()
    })
  }

  private async tick() {
    if (this.inflight >= this.maxConcurrent) return
    const job = this.queue.shift()
    if (!job) return

    const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastCallAt))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))

    this.inflight++
    this.lastCallAt = Date.now()
    try {
      const result = await this.runWithBackoff(job.fn)
      job.resolve(result)
    } catch (err) {
      job.reject(err)
    } finally {
      this.inflight--
      this.tick()
    }
  }

  private async runWithBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn()
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || err?.code === 'RATE_LIMIT'
      if (attempt >= 3 || !isRateLimit) throw err
      const delay = Math.min(60_000, 2 ** attempt * 2_000)  // 2s, 4s, 8s, ...
      await new Promise(r => setTimeout(r, delay))
      return this.runWithBackoff(fn, attempt + 1)
    }
  }

  get pending() { return this.queue.length + this.inflight }
}

export const aiQueue = new AIQueue()
```

> **주의 — 서버리스 한계**: Vercel 함수는 인스턴스가 여러 개 동시 실행될 수 있어, In-memory 큐는 **단일 인스턴스 한정**. Phase 2에서는 Upstash Redis 또는 Supabase Realtime 기반 분산 락으로 전환.

---

## UI 진행률 (사용자 경험)

대기 시간이 5초를 넘으면 사용자에게 진행률 표시:

```tsx
'use client'
import { useFormStatus } from 'react-dom'

function AIProgressIndicator() {
  const { pending } = useFormStatus()
  if (!pending) return null
  return (
    <div className="text-sm text-muted-foreground">
      AI 분석 중입니다… (최대 60초 대기 가능)
    </div>
  )
}
```

또는 SSE/streaming 응답으로 부분 결과를 흘려보내기:

```ts
// Route Handler
export async function POST(req: Request) {
  const stream = streamText({
    model: google('gemini-1.5-flash'),
    prompt: await req.text(),
  })
  return stream.toDataStreamResponse()
}
```

---

## 모니터링 (Phase 2)

```ts
// lib/ai/metrics.ts
let callsThisMinute = 0
let resetAt = Date.now() + 60_000

export function recordAICall() {
  if (Date.now() > resetAt) {
    callsThisMinute = 0
    resetAt = Date.now() + 60_000
  }
  callsThisMinute++
  if (callsThisMinute > 10) {
    console.warn(`[AI] RPM=${callsThisMinute}, 안전 마진 근접`)
  }
}
```

---

## 위반 시
- 런타임: 429 발생 시 큐가 자동 재시도. 3회 초과 시 사용자에게 "AI 응답 지연 중" 알림 후 수동 모드 제안.
- 코드 리뷰: `generateText|streamText|generateObject` 직접 호출 발견 시 PR 거절.
- CI lint (추후): `grep -rE "(generateText|streamText|generateObject)\(" src/ app/ lib/ --exclude=lib/ai/queue.ts | grep -v "aiQueue.enqueue"` 0건 강제.
