---
name: 300-nextjs-app-router-rules
description: Next.js 15+ App Router 컨벤션 — Server/Client Component 경계, Server Action, Route Handler, 캐싱, 데이터 페칭 패턴.
---

# 300 — Next.js App Router Conventions

본 스킬은 FactoryAI의 모든 Next.js 코드(`app/`, `components/`, `lib/`)가 따라야 할 규칙입니다.

---

## 0. Backend-only Quick Reference (백엔드 dev 즉시 참조)

> 백엔드 작업만 한다면 이 섹션과 §4~§6만 봐도 됨. 프론트엔드는 §1~§3 참조.

### 0-1. 어디에 코드를 두는가
| 종류 | 위치 | 예 |
|---|---|---|
| 폼/UI mutation | Server Action — `app/(group)/<feature>/actions.ts` | `createLot`, `approveAiSuggestion` |
| 외부 REST/Webhook | Route Handler — `app/api/v1/<resource>/route.ts` | `POST /api/v1/erp/sync` |
| 재사용 비즈니스 로직 | `lib/<domain>/<name>.ts` | `lib/lot/merge.ts` |
| DB 접근 | `lib/prisma.ts` 싱글톤 | `import { prisma } from '@/lib/prisma'` |
| AI 호출 | `lib/ai/<name>.ts` (반드시 `aiQueue` 경유) | `lib/ai/xai.ts` |
| 인증 가드 | `lib/rbac.ts` | `await requireRole(['ADMIN'])` |

### 0-2. 표준 첫 5줄 패턴
모든 Server Action / Route Handler는 다음 5줄로 시작:
```ts
'use server'                                          // (Server Action만)
import { z } from 'zod'
import { requireRole } from '@/lib/rbac'              // R5
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'               // R4
```

### 0-3. Server Action vs Route Handler 결정표
| 상황 | 선택 |
|---|---|
| 폼 submit (useFormState) | Server Action |
| 클라이언트 컴포넌트에서 직접 호출 (`<form action={fn}>`) | Server Action |
| 외부 시스템이 호출 (webhook, cron, mobile) | Route Handler |
| 파일 download/stream | Route Handler |
| 표준 REST 인터페이스 필요 | Route Handler |
| 캐시 무효화 자동 처리 원함 | Server Action (`revalidatePath` 호출) |

### 0-4. 백엔드 핵심 skill 라우팅
- Server Action 골격 → `310-server-action-patterns`
- Route Handler 골격 → `311-route-handler-patterns`
- RBAC 가드 → `312-rbac-guard`
- audit_log 헬퍼 → `313-audit-log-helper`
- 인증 (NextAuth v5) → `314-nextauth-v5-setup`
- 에러 envelope → `315-api-error-handling`
- 트랜잭션 → `318-prisma-transactions`

---

## 1. Server vs Client Component 결정 트리

```
컴포넌트가 다음 중 하나라도 필요한가?
├── useState / useReducer / useContext           → 'use client'
├── useEffect / useLayoutEffect                  → 'use client'
├── 브라우저 API (window, localStorage)           → 'use client'
├── 이벤트 핸들러 (onClick, onChange — Server Action prop 제외)  → 'use client'
├── 외부 클라이언트 라이브러리 (e.g. @react-pdf/renderer)  → 'use client'
└── 그 외 (DB 페칭, 정적 렌더링)                   → Server Component (default)
```

> **꿀팁**: 클라이언트 부모 안에서도 자식이 children prop으로 들어오면 그 자식은 Server Component로 유지됩니다. 무조건 'use client' 전염되지 않습니다.

## 2. 폴더 구조

```
app/
├── (auth)/                       # Route group (URL에 영향 없음)
│   ├── login/
│   │   ├── page.tsx              # Server Component
│   │   └── actions.ts            # 'use server'
│   └── layout.tsx
├── (dashboard)/
│   ├── audit-reports/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx       # Suspense fallback
│   │   ├── actions.ts
│   │   └── error.tsx             # Error boundary
│   └── layout.tsx
├── api/v1/
│   └── audit-reports/
│       └── route.ts              # Route Handler
├── layout.tsx                    # Root layout
├── loading.tsx                   # Global loading
├── error.tsx                     # Global error
├── not-found.tsx                 # 404
└── page.tsx                      # Home
```

## 3. 데이터 페칭 패턴

### Server Component (기본)
```tsx
// app/(dashboard)/audit-reports/page.tsx
import { prisma } from '@/lib/prisma'

export default async function AuditReportsPage() {
  const reports = await prisma.auditReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return <ReportTable reports={reports} />
}
```

### Client에서 동적 fetch가 필요한 경우
```tsx
// components/features/audit/LiveStatus.tsx
'use client'
import { useEffect, useState } from 'react'
import { getReportStatus } from './actions'  // Server Action

export function LiveStatus({ id }: { id: string }) {
  const [status, setStatus] = useState<string>()
  useEffect(() => {
    const interval = setInterval(async () => {
      setStatus(await getReportStatus(id))
    }, 5000)
    return () => clearInterval(interval)
  }, [id])
  return <span>{status}</span>
}
```

## 4. Server Action 패턴

```ts
// app/(dashboard)/audit-reports/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const InputSchema = z.object({
  lotIds: z.array(z.string().cuid()).min(1).max(100),
})

export async function createAuditReport(input: unknown) {
  const session = await requireRole(['ADMIN', 'OPERATOR'])    // R5
  const data = InputSchema.parse(input)                       // 입력 검증

  const report = await prisma.auditReport.create({
    data: { ...data, createdById: session.user.id, status: 'PENDING_APPROVAL' },
  })

  await prisma.auditLog.create({                              // R4
    data: { actor: `user-${session.user.id}`, action: 'CREATE', targetType: 'AuditReport', targetId: report.id, after: report },
  })

  revalidatePath('/audit-reports')
  return { success: true, id: report.id }
}
```

## 5. Route Handler 패턴

```ts
// app/api/v1/audit-reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await requireRole(['ADMIN'])
  const body = await req.json()
  // ...
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

**언제 Server Action vs Route Handler**
- Server Action: 내부 폼/UI에서 호출, 캐시 무효화 자동
- Route Handler: 외부 webhook, 표준 REST 인터페이스, file download

## 6. 캐싱 전략

| API | 동작 |
|:---|:---|
| `fetch(url)` | 기본 force-cache. `{ cache: 'no-store' }`로 비활성. |
| `fetch(url, { next: { revalidate: 60 }})` | 60초 ISR |
| `fetch(url, { next: { tags: ['reports'] }})` | revalidateTag로 무효화 |
| `revalidatePath('/x')` | 경로 캐시 무효화 |
| `revalidateTag('reports')` | 태그 캐시 무효화 |
| `dynamic = 'force-dynamic'` | 페이지 항상 동적 |

Prisma 쿼리는 fetch 캐시와 별개 — 명시적 `revalidatePath` 호출 필수.

## 7. Loading/Error UX

```tsx
// app/(dashboard)/audit-reports/loading.tsx
export default function Loading() {
  return <Skeleton className="h-96 w-full" />
}

// app/(dashboard)/audit-reports/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      <button onClick={reset}>재시도</button>
    </div>
  )
}
```

## 8. 메타데이터

```tsx
// app/(dashboard)/audit-reports/[id]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string }}): Promise<Metadata> {
  const report = await getReport(params.id)
  return { title: `감사 리포트 #${report.id} | FactoryAI` }
}
```

## 9. 환경별 동작

- `NEXT_PUBLIC_*`만 브라우저 노출. 그 외는 서버 전용.
- `process.env.X`를 클라이언트 컴포넌트에서 접근하면 빌드 타임에 인라인 (또는 undefined).

## 10. 자주 하는 실수

| 실수 | 해결 |
|:---|:---|
| Server Component에서 `useState` | 'use client' 추가 |
| Client Component에서 직접 Prisma 호출 | Server Action 또는 Route Handler 경유 |
| `process.env.SECRET`을 클라이언트에서 import | 서버 전용 모듈로 분리, 클라이언트는 Server Action 호출 |
| `cache()` 미사용으로 같은 페이지에서 같은 쿼리 N번 | `import { cache } from 'react'` 로 감싸기 |
| `'use server'` 함수에서 `Date.now()` 후 client에 전달 → hydration mismatch | 서버 시간 형식으로 변환해 전달 |

---

## See also

- [.agents/rules/002-tech-stack.md](../../rules/002-tech-stack.md) §3 (폴더 구조)
- [.agents/rules/003-development-guidelines.md](../../rules/003-development-guidelines.md) §2 (Architecture)
- [.claude/agents/nextjs-frontend.md](../../../.claude/agents/nextjs-frontend.md)
- [.claude/agents/nextjs-backend.md](../../../.claude/agents/nextjs-backend.md)
