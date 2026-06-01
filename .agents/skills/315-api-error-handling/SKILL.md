---
name: 315-api-error-handling
description: API 에러 클래스·HTTP envelope·사용자/로그 분리 표준. `lib/errors.ts`, `apiError` 식별자 또는 try/catch 작업 시 자동.
---

# API Error Handling

> **자동 발동 트리거** (좁게): `lib/errors.ts` 파일, `apiError|AppError|ValidationError|ForbiddenError` 식별자 작성 시.

REQ-NF-004 — 일관된 에러 응답·로깅·사용자 메시지. 한국어 친화 + 영문 로그 분리.

---

## 1. 에러 클래스 (`lib/errors.ts`)

```ts
// lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,                              // 'VALIDATION_ERROR' 등
    message: string,                                  // 한국어 사용자 메시지
    public status: number = 500,                     // HTTP status
    public details?: unknown,                        // 디버그 정보 (개발만 노출)
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(message = '입력값이 올바르지 않습니다.', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = '로그인이 필요합니다.') {
    super('UNAUTHENTICATED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다.') {
    super('FORBIDDEN', message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = '리소스') {
    super('NOT_FOUND', `${resource}을(를) 찾을 수 없습니다.`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message = '중복된 요청입니다.') {
    super('CONFLICT', message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSec?: number) {
    super('RATE_LIMIT', '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429, { retryAfterSec })
  }
}

export class AiError extends AppError {
  constructor(message = 'AI 응답을 받지 못했습니다.', details?: unknown) {
    super('AI_ERROR', message, 502, details)
  }
}

export class AiSafetyBlockedError extends AppError {
  constructor() {
    super('AI_SAFETY_BLOCKED', 'AI가 안전 정책상 응답하지 않았습니다. 다른 표현으로 시도해 주세요.', 422)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string) {
    super('EXTERNAL_SERVICE_ERROR', `${service} 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.`, 503)
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
```

---

## 2. Route Handler용 헬퍼 (`apiError`)

```ts
// lib/errors.ts (계속)
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function apiError(err: unknown): NextResponse {
  // 1) AppError 계열
  if (isAppError(err)) {
    logError(err)
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status }
    )
  }

  // 2) Zod
  if (err instanceof ZodError) {
    const ve = new ValidationError('입력값이 올바르지 않습니다.', err.flatten())
    logError(ve)
    return NextResponse.json({ error: { code: ve.code, message: ve.message, details: ve.details }}, { status: 400 })
  }

  // 3) Prisma — 알려진 에러만 표면화
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as any).code)
    if (code === 'P2002') {
      return NextResponse.json({ error: { code: 'CONFLICT', message: '이미 존재하는 값입니다.' }}, { status: 409 })
    }
    if (code === 'P2025') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '대상을 찾을 수 없습니다.' }}, { status: 404 })
    }
  }

  // 4) 그 외 — 시스템 결함
  logError(err)
  const isProd = process.env.NODE_ENV === 'production'
  return NextResponse.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      details: isProd ? undefined : String(err),
    }
  }, { status: 500 })
}

function logError(err: unknown) {
  // 로그는 영문/원본 형식 — Sentry/Vercel logs로
  console.error('[error]', err)
  // Phase 2: Sentry.captureException(err)
}
```

---

## 3. Server Action 패턴 (ActionResult)

Server Action은 `apiError` 대신 `ActionResult<T>` 사용:

```ts
'use server'
import { isAppError } from '@/lib/errors'
import type { ActionResult } from '@/lib/action-result'

export async function createLot(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole(['ADMIN', 'OPERATOR'])
    const data = LotSchema.parse(Object.fromEntries(formData))
    const lot = await prisma.lot.create({ data })
    return { ok: true, data: { id: lot.id } }
  } catch (err) {
    if (isAppError(err)) {
      return { ok: false, error: { code: err.code, message: err.message, details: err.details }}
    }
    if (err instanceof ZodError) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: err.flatten() }}
    }
    // 시스템 결함 — throw → error.tsx
    throw err
  }
}
```

또는 헬퍼화:

```ts
// lib/action-result.ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown }}

export async function tryAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: { code: err.code, message: err.message, details: err.details }}
    if (err instanceof ZodError) return { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: err.flatten() }}
    throw err
  }
}

// 사용
export async function createLot(formData: FormData) {
  return tryAction(async () => {
    const session = await requireRole(['ADMIN', 'OPERATOR'])
    const data = LotSchema.parse(Object.fromEntries(formData))
    const lot = await prisma.lot.create({ data })
    return { id: lot.id }
  })
}
```

---

## 4. HTTP Status 매핑

| 상황 | Status | 클래스 |
|---|:---:|---|
| 입력 검증 실패 | 400 | `ValidationError` |
| 미인증 | 401 | `UnauthenticatedError` |
| 권한 없음 | 403 | `ForbiddenError` |
| 자원 없음 | 404 | `NotFoundError` |
| 중복/충돌 | 409 | `ConflictError` |
| AI 안전 필터 발동 | 422 | `AiSafetyBlockedError` |
| Rate Limit | 429 | `RateLimitError` (Retry-After 헤더 포함) |
| 시스템 결함 | 500 | (분류 안 됨) |
| AI/외부 서비스 오류 | 502/503 | `AiError`, `ExternalServiceError` |

---

## 5. Error Boundary (`app/error.tsx`)

```tsx
// app/error.tsx
'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 클라이언트 측 에러 로깅 (Phase 2: Sentry)
    console.error(error)
  }, [error])

  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold mb-2">오류가 발생했습니다</h2>
      <p className="text-muted-foreground mb-4">잠시 후 다시 시도해 주세요.</p>
      {error.digest && <p className="text-xs text-muted-foreground mb-4">참조 코드: {error.digest}</p>}
      <button onClick={reset} className="btn-primary">재시도</button>
    </div>
  )
}
```

```tsx
// app/global-error.tsx — 루트 layout 자체가 깨졌을 때
'use client'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <h2>심각한 오류가 발생했습니다.</h2>
        <button onClick={reset}>재시도</button>
      </body>
    </html>
  )
}
```

---

## 6. 한국어 메시지 + 영문 로그 분리

| 표시 | 노출 위치 |
|---|---|
| **한국어 사용자 메시지** | 응답 envelope `error.message`, UI 토스트 |
| **영문 원본 / 스택** | `console.error`, Vercel logs, Sentry (Phase 2) |
| **에러 코드** | 응답 `error.code`, 사용자에게 노출 OK (참조용) |
| **details** | dev에서만 노출 (prod은 숨김) |

---

## 7. HITL 위반은 즉시 alert

```ts
// lib/errors.ts (추가)
export class HitlViolationError extends AppError {
  constructor(message: string) {
    super('HITL_VIOLATION', message, 500)
    // 즉시 알림 (CISO에게)
    notifyOps('🚨 HITL Violation: ' + message)
  }
}
```

---

## 8. PR 체크리스트
- [ ] 모든 throw는 `AppError` 계열 또는 시스템 결함
- [ ] Route Handler는 try/catch → `apiError(err)` 반환
- [ ] Server Action은 `tryAction(fn)` 또는 명시적 ActionResult 처리
- [ ] 사용자 메시지는 한국어, 로그는 영문
- [ ] details는 prod에서 숨김 (`process.env.NODE_ENV === 'production'`)
- [ ] HITL 위반은 `HitlViolationError`로 즉시 alert

## See also
- `310-server-action-patterns` ActionResult
- `311-route-handler-patterns` apiError 응답
- `312-rbac-guard` ForbiddenError/UnauthenticatedError
- `319-user-rate-limiting` RateLimitError
