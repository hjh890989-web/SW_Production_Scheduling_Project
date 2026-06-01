---
name: 102-fix-typecheck
description: TypeScript tsc 또는 ESLint 오류 발생 시 자동 발동. strict 모드·`noUncheckedIndexedAccess` 기준으로 타입 안전성 우선 해결.
---

# Fix TypeCheck / Lint

> **자동 발동 트리거**: `npm run typecheck`, `npm run lint`, `tsc --noEmit` 실패 또는 IDE 빨간 줄.

## 원칙

1. **`any` 도입 금지**. 불가피하면 `unknown` 후 narrowing.
2. **`@ts-ignore` / `@ts-expect-error` 도입 금지**. 정말 필요하면 한 줄 사유 주석 + TODO.
3. **타입 단언(`as Foo`) 최소화**. 가능하면 type guard 함수.
4. **Lint 자동 수정 먼저** (`npm run lint -- --fix`) → 수동 수정은 그 다음.

## 흐름

### 1. 전체 진단
```bash
npm run typecheck 2>&1 | head -100
npm run lint
```

### 2. 에러 분류
| 분류 | 대응 |
|---|---|
| Missing types | `@types/*` 설치 또는 `declare module` |
| `possibly undefined` | optional chaining 또는 guard |
| `not assignable to` | 타입 좁히기 또는 schema 분리 |
| `unused variable` | 삭제 (prefix `_` 금지) |
| `react-hooks/exhaustive-deps` | 의존성 추가 또는 `useEffectEvent` 패턴 |

### 3. 수정 후 재실행
```bash
npm run typecheck && npm run lint
```
모두 0건이어야 통과.

### 4. 커밋 분리
타입/lint 수정은 별도 커밋: `[chore] fix typecheck/lint errors`.

## FactoryAI 표준 패턴

### Zod로 unknown narrowing
```ts
const ParsedSchema = z.object({ id: z.string(), value: z.number() })
function process(input: unknown) {
  const data = ParsedSchema.parse(input)
  // 이제 data는 안전한 타입
}
```

### Prisma 결과 타입 활용
```ts
import { Prisma } from '@prisma/client'
type LotWithEntries = Prisma.LotGetPayload<{ include: { entries: true } }>
```

### Server Action prop 타입
```ts
// formData는 늘 FormData
export async function createLot(formData: FormData) {
  const data = LotSchema.parse(Object.fromEntries(formData))
  // ...
}
```

---

## FactoryAI 백엔드 특화 케이스

### NextRequest / NextResponse
```ts
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()                       // unknown
  const data = MySchema.parse(body)                   // 타입 narrow
  const auth = req.headers.get('authorization')       // string | null — guard 필수
  if (!auth) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' }}, { status: 401 })
  }
  // ...
}
```

### Prisma JSON 컬럼 (`Json` 필드)
```ts
import { Prisma } from '@prisma/client'

// 읽을 때: Prisma.JsonValue → 좁히기 필요
const log = await prisma.auditLog.findFirst({ where: { id } })
if (log?.after && typeof log.after === 'object' && !Array.isArray(log.after)) {
  const after = log.after as Prisma.JsonObject
  // ...
}

// 저장할 때: JsonValue를 받는 필드에 plain object 전달
await prisma.auditLog.create({
  data: { /* ... */, after: { foo: 1, bar: 'x' } as Prisma.InputJsonValue },
})
```

### NextAuth v5 Session 타입 확장
```ts
// types/next-auth.d.ts
import { type DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'OPERATOR' | 'QC' | 'CISO' | 'VIEWER'
    } & DefaultSession['user']
  }
}
```

### FormData → 타입 좁히기
```ts
'use server'
export async function action(formData: FormData) {
  // FormData.get은 FormDataEntryValue | null
  const raw = Object.fromEntries(formData)
  const data = ActionSchema.parse(raw)                // Zod가 string→number 변환·검증
  // ...
}
```

### `unknown` returned from try/catch
```ts
try { /* ... */ }
catch (err) {
  // err: unknown — narrow 필수
  if (err instanceof Error) console.error(err.message)
  if (err && typeof err === 'object' && 'code' in err) {
    // err.code 접근 가능
  }
}
```
