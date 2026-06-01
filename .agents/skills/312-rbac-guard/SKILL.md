---
name: 312-rbac-guard
description: RBAC 가드(requireRole/requireAuth) 구현·사용 표준. `lib/rbac.ts`, `middleware.ts` 파일 또는 `requireRole`/`requireAuth`/`hasRole` 식별자 작업 시 자동.
---

# RBAC Guard (`lib/rbac.ts`) — 5역할 구현

> **자동 발동 트리거** (좁게): `lib/rbac.ts`, `middleware.ts`, `lib/auth.ts` 파일 작업, 또는 `requireRole|requireAuth|hasRole|assertRole` 식별자 작성 시.

SRS §5-3 / REQ-NF-004 — RBAC 5역할 분리. Server Action / Route Handler 첫 줄에 가드 강제.

---

## 1. 역할 정의 (5종 + 기본)

```ts
// lib/rbac.ts (또는 types/auth.ts)
export const ROLES = ['ADMIN', 'OPERATOR', 'QC', 'CISO', 'VIEWER'] as const
export type Role = typeof ROLES[number]
```

### 역할별 책임
| Role | 한국어 | 책임 영역 |
|---|---|---|
| `ADMIN` | 시스템 관리자 | 사용자 관리, 시스템 설정, 전체 데이터 |
| `OPERATOR` | 현장 운영 | 로그 입력·조회, 일일 리포트, 자기 데이터 |
| `QC` | 품질 관리 | XAI 결과 승인/거절, 이상 탐지 검토 |
| `CISO` | 보안 책임자 | 감사 로그 조회, RBAC 변경, 보안 정책 |
| `VIEWER` | 읽기 전용 | 대시보드 조회만 |

페르소나 매핑 (SRS §2): COO/공장장 → `OPERATOR` + `ADMIN`, 구매본부장/품질이사 → `QC`, CIO → `OPERATOR` + `ADMIN`, CFO → `VIEWER` + `OPERATOR`, CISO → `CISO`.

---

## 2. 구현 (`lib/rbac.ts`)

```ts
import { auth } from '@/auth'                  // NextAuth v5
import type { Session } from 'next-auth'
import { ForbiddenError, UnauthenticatedError } from '@/lib/errors'

export const ROLES = ['ADMIN', 'OPERATOR', 'QC', 'CISO', 'VIEWER'] as const
export type Role = typeof ROLES[number]

/**
 * 인증된 세션 보장 (역할 무관). 없으면 throw.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth()
  if (!session?.user) throw new UnauthenticatedError('로그인이 필요합니다.')
  return session
}

/**
 * 허용 역할에 포함되는지 확인. 아니면 throw.
 */
export async function requireRole(allowed: readonly Role[]): Promise<Session> {
  const session = await requireAuth()
  const userRole = session.user.role
  if (!allowed.includes(userRole)) {
    throw new ForbiddenError(
      `이 작업에 필요한 권한이 없습니다. (필요: ${allowed.join('|')}, 보유: ${userRole})`
    )
  }
  return session
}

/**
 * Boolean 체크 — 조건부 UI에 사용.
 */
export async function hasRole(allowed: readonly Role[]): Promise<boolean> {
  const session = await auth()
  return !!session?.user && allowed.includes(session.user.role)
}

/**
 * "본인 데이터" 가드. ADMIN/CISO는 항상 허용.
 */
export async function requireOwnerOrRole(
  ownerId: string,
  fallbackRoles: readonly Role[] = ['ADMIN']
): Promise<Session> {
  const session = await requireAuth()
  if (session.user.id === ownerId) return session
  if (fallbackRoles.includes(session.user.role)) return session
  throw new ForbiddenError('본인 데이터 또는 관리자만 접근 가능합니다.')
}
```

---

## 3. 사용 패턴

### Server Action
```ts
'use server'
import { requireRole } from '@/lib/rbac'

export async function approveLot(id: string) {
  const session = await requireRole(['QC', 'ADMIN'])
  // ...
}
```

### Route Handler
```ts
export async function GET(req: NextRequest) {
  try {
    await requireRole(['CISO', 'ADMIN'])
    // ...
  } catch (err) {
    return apiError(err)  // 403 또는 401 envelope
  }
}
```

### 조건부 UI (Server Component)
```tsx
import { hasRole } from '@/lib/rbac'

export default async function Page() {
  const canApprove = await hasRole(['QC', 'ADMIN'])
  return (
    <div>
      <LotList />
      {canApprove && <ApproveButton />}
    </div>
  )
}
```

### "본인 데이터" 패턴
```ts
'use server'
export async function deleteMyLot(lotId: string) {
  const lot = await prisma.lot.findUnique({ where: { id: lotId }})
  if (!lot) throw new NotFoundError()
  await requireOwnerOrRole(lot.createdById, ['ADMIN'])
  await prisma.lot.delete({ where: { id: lotId }})
}
```

---

## 4. `middleware.ts` (라우트 단위 가드)

```ts
// middleware.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/api/health']
const CISO_ONLY = ['/dashboard/security', '/api/v1/audit-logs']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // 공개 경로
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return

  // 로그인 필요
  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // CISO 전용
  if (CISO_ONLY.some(p => pathname.startsWith(p))) {
    if (!['CISO', 'ADMIN'].includes(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

> **주의**: middleware는 1차 방어. Server Action / Route Handler 첫 줄 가드는 **여전히 필수** (middleware 우회 가능성).

---

## 5. 역할 × 자원 매트릭스 (예시)

| Server Action / Route | ADMIN | OPERATOR | QC | CISO | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `createLot` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `approveAiSuggestion` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `getAuditLogs` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `manageUsers` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `getDashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |

매트릭스는 `docs/security/rbac-matrix.md`에 유지.

---

## 6. 테스트 패턴

```ts
// tests/nfr/security/rbac.test.ts
import { describe, it, expect, vi } from 'vitest'
import { approveLot } from '@/app/(dashboard)/lots/actions'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'

describe('REQ-NF-004 RBAC — approveLot', () => {
  it('VIEWER는 403 (Forbidden) 거부', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1', role: 'VIEWER' }} as any)
    await expect(approveLot('lot1')).rejects.toThrow(/권한이 없습니다/)
  })

  it('QC는 통과', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u2', role: 'QC' }} as any)
    // ... 통과 시나리오
  })
})
```

---

## 7. PR 체크리스트
- [ ] 모든 Server Action 첫 줄 `await requireRole([...])`
- [ ] 모든 Route Handler 첫 비즈니스 줄 `await requireRole([...])`
- [ ] 본인 데이터는 `requireOwnerOrRole` 사용
- [ ] middleware는 1차 방어, 가드 누락 핑계 금지
- [ ] 역할 × 자원 매트릭스 (`docs/security/rbac-matrix.md`) 갱신
- [ ] 신규 가드에 대한 테스트 (`tests/nfr/security/rbac.test.ts`)

## See also
- `313-audit-log-helper` — 인증/권한 액션도 audit_log 기록
- `314-nextauth-v5-setup` — `auth()` 구현
- `315-api-error-handling` — `ForbiddenError` → 403 envelope
