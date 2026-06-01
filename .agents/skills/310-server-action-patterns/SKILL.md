---
name: 310-server-action-patterns
description: Server Action 표준 골격·반환 타입·트랜잭션 패턴. 파일 경로 `app/**/actions.ts` 또는 `'use server'` directive 작성 시 자동 발동.
---

# Server Action Patterns (CON-11 백엔드 표준)

> **자동 발동 트리거** (좁게): `app/**/actions.ts` 파일 작업, 또는 `'use server'` directive 작성 시.

CON-11 — 별도 백엔드 서버 없음. 모든 mutation은 Server Action 또는 Route Handler. **Server Action이 기본 선택**.

---

## 1. 표준 골격 (이대로 복사·붙여넣기)

```ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { ActionResult } from '@/lib/action-result'

const Input = z.object({
  lotCode: z.string().min(1).max(50),
  defectCount: z.number().int().nonnegative(),
})

export async function createLot(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1) 인증·인가 (R5)
  const session = await requireRole(['ADMIN', 'OPERATOR'])

  // 2) 입력 검증 (Zod)
  const parsed = Input.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() } }
  }
  const data = parsed.data

  // 3) 비즈니스 로직 (Prisma)
  const lot = await prisma.lot.create({ data: { ...data, createdById: session.user.id } })

  // 4) 감사 로그 (R4)
  await logAction({
    actor: `user-${session.user.id}`,
    action: 'CREATE',
    target: { type: 'Lot', id: lot.id },
    after: lot,
  })

  // 5) 캐시 무효화
  revalidatePath('/dashboard/lots')

  // 6) 결과 반환
  return { ok: true, data: { id: lot.id } }
}
```

---

## 2. ActionResult 표준 반환 타입

```ts
// lib/action-result.ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }
```

**왜**:
- `throw`는 클라이언트에서 가로채기 어려움 (Next.js가 error boundary로 흡수)
- 명시적 결과 객체는 `useFormState` / 사용자에게 친화적 피드백 제공에 유리
- 단, **시스템 결함** (DB 다운, 코드 버그)은 `throw` — error.tsx가 받음

---

## 3. useFormState 연동

```tsx
// 클라이언트 컴포넌트
'use client'
import { useFormState, useFormStatus } from 'react-dom'
import { createLot } from './actions'

const initialState: ActionResult<{ id: string }> | null = null

export function LotForm() {
  const [state, formAction] = useFormState(createLot, initialState)
  return (
    <form action={formAction}>
      <input name="lotCode" required />
      <input name="defectCount" type="number" required />
      <SubmitButton />
      {state?.ok === false && <p className="text-red-500">{state.error.message}</p>}
      {state?.ok === true && <p className="text-green-500">생성됨 (ID: {state.data.id})</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? '저장 중…' : '저장'}</button>
}
```

---

## 4. 트랜잭션이 필요한 경우 (`prisma.$transaction`)

```ts
'use server'
export async function mergeLots(input: unknown): Promise<ActionResult<{ mergedId: string }>> {
  const session = await requireRole(['ADMIN', 'OPERATOR'])
  const data = MergeInput.parse(input)

  const result = await prisma.$transaction(async (tx) => {
    const merged = await tx.lot.create({ data: { ...mergedData } })
    await tx.lot.updateMany({ where: { id: { in: data.sourceIds } }, data: { mergedIntoId: merged.id } })
    await tx.auditLog.create({
      data: {
        actor: `user-${session.user.id}`,
        action: 'MERGE',
        targetType: 'Lot',
        targetId: merged.id,
        after: { mergedFrom: data.sourceIds },
      },
    })
    return merged
  }, { isolationLevel: 'Serializable', timeout: 8000 })  // Vercel 10s 한도 고려

  revalidatePath('/dashboard/lots')
  return { ok: true, data: { mergedId: result.id } }
}
```

> 상세: `.agents/skills/318-prisma-transactions`

---

## 5. Optimistic Update (선택)

```tsx
'use client'
import { useOptimistic } from 'react'
import { approveLot } from './actions'

export function LotList({ lots }: { lots: Lot[] }) {
  const [optimisticLots, addOptimistic] = useOptimistic(
    lots,
    (state, id: string) => state.map(l => l.id === id ? { ...l, status: 'APPROVED' as const } : l)
  )

  return optimisticLots.map(lot => (
    <button key={lot.id} onClick={async () => {
      addOptimistic(lot.id)
      await approveLot(lot.id)
    }}>
      승인 {lot.status === 'APPROVED' ? '✓' : ''}
    </button>
  ))
}
```

---

## 6. 표준 import 순서 (Lint 일관성)

```ts
// 1. server directive
'use server'

// 2. Next.js
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

// 3. 외부
import { z } from 'zod'

// 4. 내부 — 가드/인프라
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors'

// 5. 타입
import type { ActionResult } from '@/lib/action-result'
```

---

## 7. 자주 하는 실수

| 실수 | 해결 |
|---|---|
| 첫 줄 `'use server'` 누락 → 클라이언트에서 호출 시 에러 | 모든 actions 파일 최상단에 `'use server'` |
| `requireRole` 누락 → 누구나 호출 가능 | 첫 줄 가드 강제 (security-reviewer로 점검) |
| `revalidatePath` 누락 → 캐시된 페이지가 stale | mutation 후 영향받는 경로 명시 |
| `try/catch` 남발 → ActionResult 흐름 깨짐 | 시스템 경계에서만, 비즈니스 에러는 ActionResult로 반환 |
| 외부 API 호출(이메일 등)을 트랜잭션 안에 포함 → 롤백 불가 | 트랜잭션 밖으로 분리, 보상 트랜잭션 |

---

## 8. PR 체크리스트
- [ ] 첫 줄 `'use server'`
- [ ] 첫 비즈니스 줄 `await requireRole([...])` (R5)
- [ ] Zod parse (R5 — 입력 검증)
- [ ] mutation 후 `logAction(...)` (R4)
- [ ] mutation 후 `revalidatePath` 또는 `revalidateTag`
- [ ] `ActionResult<T>` 반환 (시스템 결함만 throw)
- [ ] HITL 영향 시 `status: 'PENDING_APPROVAL'` (R1)

## See also
- `311-route-handler-patterns` — 외부/REST 시
- `312-rbac-guard` — `requireRole` 구현
- `313-audit-log-helper` — `logAction` 헬퍼
- `315-api-error-handling` — 에러 envelope
- `318-prisma-transactions` — 다중 테이블
