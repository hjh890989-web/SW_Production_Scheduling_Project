---
name: 314-nextauth-v5-setup
description: NextAuth.js v5 (Auth.js) 셋업·세션·미들웨어·역할 주입. `auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts` 또는 `signIn|signOut|useSession|getServerSession` 식별자 작업 시 자동.
---

# NextAuth.js v5 (Auth.js) Setup

> **자동 발동 트리거** (좁게): `auth.ts`, `middleware.ts`, `app/api/auth/**` 파일 작업, 또는 `signIn|signOut|useSession|auth\(\)` 식별자 작성 시.

**확정 결정 (2026-05-16)**: 본 프로젝트의 인증은 **NextAuth.js v5 (Auth.js)** 단일 채택. 이유는 [AGENTS.md tech-stack](../../rules/002-tech-stack.md) §Auth 참조.

---

## 0. 설치

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

---

## 1. Prisma 모델 (Auth.js 표준 + role 확장)

```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?
  name          String?
  image         String?
  role          Role      @default(VIEWER)
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

enum Role {
  ADMIN
  OPERATOR
  QC
  CISO
  VIEWER
}
```

---

## 2. `auth.ts` (루트)

```ts
// auth.ts
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logAction, actor } from '@/lib/audit'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { auth, signIn, signOut, handlers } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },                         // 서버리스 친화
  pages: { signIn: '/login' },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email, deletedAt: null }})
        if (!user?.passwordHash) {
          // 사용자 존재 여부 노출 방지 (timing attack 방어 위해 동일한 비교 수행)
          await bcrypt.compare('dummy', '$2a$10$dummyhashfortimingsafety000000000000000000')
          await logAction({
            actor: `anonymous-${parsed.data.email}`,
            action: 'LOGIN_FAILED',
            target: { type: 'User', id: 'unknown' },
            metadata: { reason: 'NO_USER' },
          })
          return null
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!ok) {
          await logAction({
            actor: actor.user(user.id),
            action: 'LOGIN_FAILED',
            target: { type: 'User', id: user.id },
            metadata: { reason: 'BAD_PASSWORD' },
          })
          return null
        }

        await logAction({
          actor: actor.user(user.id),
          action: 'LOGIN',
          target: { type: 'User', id: user.id },
        })

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    // Phase 2: SAML / OIDC (제조 고객사 사내 계정)
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },

  events: {
    async signOut(message) {
      const userId = 'token' in message ? message.token?.id : null
      if (userId) {
        await logAction({
          actor: actor.user(userId as string),
          action: 'LOGOUT',
          target: { type: 'User', id: userId as string },
        })
      }
    },
  },
})

// 타입 확장
declare module 'next-auth' {
  interface Session {
    user: { id: string; role: Role } & DefaultSession['user']
  }
  interface User {
    role?: Role
  }
}
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: Role
  }
}

type Role = 'ADMIN' | 'OPERATOR' | 'QC' | 'CISO' | 'VIEWER'
```

---

## 3. 핸들러 등록 (`app/api/auth/[...nextauth]/route.ts`)

```ts
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/auth'
// auth.ts의 handlers는 { GET, POST }로 export됨
```

> 정확히는 NextAuth v5에서:
> ```ts
> // auth.ts
> export const { auth, signIn, signOut, handlers } = NextAuth(...)
> // app/api/auth/[...nextauth]/route.ts
> export const { GET, POST } = handlers
> ```

---

## 4. `middleware.ts`

```ts
// middleware.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/api/health', '/api/auth']
const CISO_PATHS = ['/dashboard/security', '/api/v1/audit-logs', '/api/v1/security']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // 공개 경로
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return

  // 미인증
  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname + req.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // CISO 전용 — 추가 가드 (Server Action / Route Handler가 또 한 번 검증)
  if (CISO_PATHS.some(p => pathname.startsWith(p))) {
    if (!['CISO', 'ADMIN'].includes(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 5. 사용 (Server / Client)

### Server Component
```tsx
import { auth } from '@/auth'

export default async function Page() {
  const session = await auth()
  if (!session) return null
  return <p>안녕하세요, {session.user.name}님 ({session.user.role})</p>
}
```

### Server Action
```ts
'use server'
import { requireRole } from '@/lib/rbac'
// requireRole 내부에서 auth() 호출
```

### Client Component
```tsx
'use client'
import { useSession, signIn, signOut } from 'next-auth/react'

export function UserMenu() {
  const { data: session, status } = useSession()
  if (status === 'loading') return <Skeleton />
  if (!session) return <button onClick={() => signIn()}>로그인</button>
  return (
    <div>
      {session.user.name} · {session.user.role}
      <button onClick={() => signOut()}>로그아웃</button>
    </div>
  )
}
```

> `useSession`을 쓰려면 `<SessionProvider>`로 감싸야 함 (`app/providers.tsx`).

```tsx
// app/providers.tsx
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

---

## 6. 비밀번호 생성·검증

```ts
import bcrypt from 'bcryptjs'

// 가입
const hash = await bcrypt.hash(password, 12)   // 12 round (PoC 적정)

// 검증 (로그인 시) — 위 authorize 내부에서 처리
```

> bcrypt round: PoC 12, PROD 14+. **항상 timing-safe 비교** (bcrypt가 내부에서 처리).

---

## 7. 환경변수

```bash
# .env.local
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"          # 또는 https://yourdomain.com
# Production은 Vercel 환경변수로 주입
```

`NEXTAUTH_SECRET`은 JWT 서명 키 — **절대 git 커밋 금지**.

---

## 8. Audit Log 통합 (자동)

위 `auth.ts`의 `authorize`와 `events.signOut`에서 이미 처리:
- `LOGIN` — 성공 시
- `LOGIN_FAILED` — 실패 시 (이메일 + 사유)
- `LOGOUT` — 로그아웃 시

브루트포스 탐지는 `319-user-rate-limiting`에서 처리.

---

## 9. PR 체크리스트
- [ ] `auth.ts` 루트에 위치, `auth/signIn/signOut/handlers` export
- [ ] `app/api/auth/[...nextauth]/route.ts` 핸들러 등록
- [ ] `middleware.ts`에 공개 경로 화이트리스트 + 인증 강제
- [ ] Prisma User 모델에 `role` enum 포함
- [ ] JWT/Session 콜백에서 `role` 주입
- [ ] 비밀번호는 항상 bcrypt 해시
- [ ] `LOGIN/LOGOUT/LOGIN_FAILED` audit 기록
- [ ] `NEXTAUTH_SECRET` `.gitignore` 확인
- [ ] 타입 확장 (`Session`, `JWT`) 적용

## See also
- `312-rbac-guard` — `requireRole`은 `auth()` 호출
- `313-audit-log-helper` — `LOGIN/LOGOUT` 기록
- `319-user-rate-limiting` — 로그인 brute-force 방어
- `315-api-error-handling` — `UnauthenticatedError` → 401
