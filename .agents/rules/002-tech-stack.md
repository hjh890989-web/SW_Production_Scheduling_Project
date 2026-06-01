---
description: FactoryAI 기술 스택 — Next.js 풀스택 모놀리스 (MVP)
globs: ["**/*"]
alwaysApply: true
---

# 002 — Technical Stack

> **원천**: [`docs/2_SRS_V_1.0.md`](../../docs/2_SRS_V_1.0.md) SRS v0.8 §1.2.3 (CON-01~12) / §10 (ADR-1~11)

## 1. MVP 스택 (현재 적용)

### Frontend / Backend (단일 프레임워크)
- **Framework**: Next.js 15+ (**App Router**) — CON-01 / ADR-8
- **Language**: TypeScript (strict 모드)
- **Server 로직**: Server Actions + Route Handlers — CON-11 (별도 백엔드 서버 없음)
- **UI 라이브러리**: shadcn/ui (Radix 기반)
- **스타일링**: Tailwind CSS — CON-10
- **Form**: React Hook Form + Zod
- **테이블**: TanStack Table v8

### Database
- **ORM**: Prisma — CON-09 / ADR-10
- **Dev**: SQLite (로컬 빠른 반복)
- **MVP**: Supabase PostgreSQL (Free Tier, 500MB)
- **PROD (Phase 2)**: Local PostgreSQL (Docker)

### AI / LLM
- **SDK**: Vercel AI SDK — ADR-9
- **Provider**: Google Gemini API
- **티어 (MVP)**: Free Tier 15 RPM Flash → PoC 시 유료 ($15/월)
- **로컬 LLM (Phase 2)**: Ollama / vLLM 전환 목표

### Storage / File
- **Supabase Storage** (1GB Free) — 이미지·오디오 원본
- **PDF 생성**: 클라이언트 사이드 (`@react-pdf/renderer` 브라우저 모드 또는 `window.print()`) — CON-07 / ASM-09

### Auth
- **NextAuth.js v5 (Auth.js)** — 확정 (2026-05-16). Phase 2 On-Prem 전환·외부 의존 최소화 정신과 일관
- **RBAC 역할**: `ADMIN`, `OPERATOR`, `QC`, `CISO`, `VIEWER`
- **Provider (MVP)**: Credentials (이메일+비밀번호, bcrypt 해시)
- **Provider (Phase 2)**: SAML / OIDC (제조 고객사 사내 계정 통합)
- **세션 전략**: JWT (Stateless, 서버리스 친화)

### Deployment
- **호스팅**: Vercel (Free Tier) — CON-04, CON-12
- **자동 배포**: Git Push → Vercel 빌드 → 자동 롤백 지원
- **DNS / Edge**: Cloudflare (선택, Free)

### Dev Tooling
- **Lint**: ESLint + `eslint-config-next`
- **Format**: Prettier
- **Type Check**: `tsc --noEmit`
- **Test**: Vitest + React Testing Library (MVP 최소 커버리지)
- **CI**: GitHub Actions (Phase 2)

---

## 2. 절대 금지 스택 (사용하지 말 것)

| 금지 항목 | 이유 |
|:---|:---|
| Java / Spring Boot / Gradle | SRS에서 제외 — Next.js Server Actions로 대체 |
| Kafka / RabbitMQ | MVP 단일 사용자 시나리오에 불필요 |
| Flutter / React Native | MVP 모바일 클라이언트 없음 |
| FastAPI / Django / Express | 별도 백엔드 서버 금지 (CON-11) |
| Redis (Lettuce/Redisson) | Vercel 환경에 부적합, MVP에 불필요 |
| MySQL | Prisma + PostgreSQL/SQLite 전용 |
| Docker / Docker Compose (MVP) | Phase 2까지 보류 (CON-01P 이연) |
| Hugging Face / OpenAI API | LLM은 Gemini 단일 (CON-08) |
| LangChain / LangGraph | Vercel AI SDK 표준 사용 |

> **예외**: 위 기술이 SRS에 명시적으로 들어오는 Phase 2 이후 시점이면 해당 ADR 작성 후 재검토.

---

## 3. 폴더 구조 (Convention)

```
my_RPA_AI_SaaS_app/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 인증 라우트 그룹
│   ├── (dashboard)/        # 메인 대시보드 라우트 그룹
│   ├── api/v1/             # Route Handlers (REST API)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트
│   └── features/           # 기능별 컴포넌트
├── lib/
│   ├── prisma.ts           # Prisma 클라이언트 싱글톤
│   ├── ai/                 # Vercel AI SDK 헬퍼 (Gemini, Rate Limit)
│   ├── rbac.ts             # RBAC 가드
│   └── utils.ts            # 공통 유틸 (cn 등)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/                 # 정적 파일
├── docs/                   # PRD/SRS/ADR
└── tests/                  # Vitest 테스트
```

**경로 별칭**: `@/*` → 프로젝트 루트 (`tsconfig.json` paths).

---

## 4. 환경 변수 (.env)

```bash
# Database
DATABASE_URL="postgresql://..."           # Supabase PostgreSQL
DIRECT_URL="postgresql://..."             # Prisma migration용 직접 연결

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."           # 서버 전용 — 클라이언트 노출 금지

# Gemini
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Auth (NextAuth 선택 시)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://..."
```

> `.env.local`은 절대 커밋 금지 (이미 `.gitignore`에 포함).

---

## See also

- [001-project-overview.md](001-project-overview.md)
- [003-development-guidelines.md](003-development-guidelines.md)
- [004-hitl-and-security.md](004-hitl-and-security.md)
