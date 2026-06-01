# Project

이 문서는 Claude Code가 작업 시작 시 자동으로 로드하는 본 프로젝트의 컨텍스트입니다.
원본 기준 문서는 [Stage_A/4_개발계획서_v1.3.md](Stage_A/4_개발계획서_v1.3.md)·[Stage_C/19_PRD_v1.4.md](Stage_C/19_PRD_v1.4.md)이며, 본 파일은 그 요약 인덱스 역할을 합니다.

---

## 1. Project Overview

### Vision
송우산업(주)의 자동차부품 고무호스 제조 공정에서 **수주 통합 → 압출·성형 스케줄링 → MES 연동**을 자동화하여 납기 준수율을 높이고 공정 손실(금형 교체·다이스/노즐 변경·셋업)을 최소화하는 **사내 생산 스케줄링 시스템 (EVS, Extrusion & Vulcanization Scheduling)**.

### Core Features
- F-1 수주 통합 (월예상/KD/주간발주 엑셀 3종 → 단일 통합 DB)
- F-2 자동 백워드 스케줄링 (D-2/D-1 룰 보장)
- F-3 사용자 수동 보정 UI (드래그·재배분, T5.6 J-MR-2 채택 성패 결정)
- F-4 변경 영향 시뮬레이션 (5분 이내 진행중 건 자동 식별)
- F-5 MES 연동 (자체 MES 작업실적 자동 동기화)
- F-6 영림원 ERP 연동 (수주 헤더 마스터)
- F-7 통합 대시보드 · 알림
- F-8 Excel/PDF 출력

### Target Audience
- Primary users (사내, 약 20명): 생산관리팀, 성형/압출 반장, 영업·수주팀, 자재구매팀
- Secondary users: 경영진(KPI 대시보드 열람), MES/ERP 시스템(API 통신)

### Project Philosophy
- **점진 확대형**: 1차 도입은 실리콘 47품번 → 검증 후 EPDM/NBR 확대 (확장 필드 처음부터 포함)
- **자동 + 수동 보정**: 자동 백워드 스케줄링이 1차, 현장 반장의 수동 보정이 최종 (D10 의사결정)
- **사내망 전용**: 외부 LLM·SaaS 금지 (영업비밀·OEM NDA), 자체호스팅 원칙
- **Cloud-Ready**: 12-Factor 준수로 향후 클라우드 이전 옵션 보존 (현재는 사내 단일 서버)

### Stage 진행 단계 (V-모델)
- ✅ Stage_A 개발계획서·문제정의서 (v1.0~v1.3) — [Stage_A/](Stage_A/)
- ✅ Stage_B 페르소나·JTBD·VPS — [Stage_B/](Stage_B/)
- ✅ Stage_C PRD v1.4 + **WBS v1.1** (13 Sprint × **117 Task**, T0.8/T5.12 추가) + ADR D-22/D-25 — [Stage_C/](Stage_C/)
- ✅ Stage_D 115개 GitHub Issue 명세서 (T0.1 ~ T12.7.4) — [Stage_D/issues/](Stage_D/issues/)
- 🔜 **현재: Sprint 0 코드 착수 직전** (T0.1 Next.js 프로젝트 생성부터)

---

## 2. Tech Stack

> 출처: [Stage_A/4_개발계획서_v1.3.md](Stage_A/4_개발계획서_v1.3.md) §13, [Stage_C/19_PRD_v1.4.md](Stage_C/19_PRD_v1.4.md), [Stage_D/issues/T0.*](Stage_D/issues/)

### Frontend
- Framework: **Next.js 14+ App Router** (`output: 'standalone'`)
- Language: TypeScript (strict)
- Styling: Tailwind CSS 3.x
- Component Library: shadcn/ui (Radix UI 기반)
- 상태/폼: React Server Components + Server Actions, 클라이언트 폼은 React Hook Form + zod
- 차트: Recharts 또는 Visx (KPI 대시보드용 — 결정 보류)

### Backend
- Runtime: Node.js 20 LTS
- API: Next.js Route Handlers + Server Actions
- ORM: **Prisma**
- Database (dev): SQLite (file-based, `prisma/dev.db`)
- Database (prod): **PostgreSQL 16** (사내 단일 인스턴스, AuditLog 5년 보존)
- 객체 저장소: MinIO (S3 호환) — 첨부·PDF 출력물
- 배치/스케줄러: 호스트 cron (백업·아카이빙) + Node-cron (애플리케이션 내부)
- 최적화 엔진(Phase 2): Python + **OR-Tools** 마이크로서비스 (T12.x)

### Authentication & Authorization
- **Auth.js v5** (NextAuth 후속) — Credentials provider + bcrypt(12)
- 사내 LDAP 연동은 Phase 2 (T12.x), 초기는 자체 사용자 테이블
- RBAC 6 Role: Admin / Manager / Sales / Material / ExtrusionForeman / MoldingForeman
- 5회 실패 시 계정 잠금, 세션은 secure cookie + SameSite=Strict + AuditLog IP/sessionId

### External Integrations
- **영림원 ERP**: 수주 헤더 마스터 (REST, Sprint 10 — 연동 명세 TBD)
- **자체 MES**: 작업실적 동기화 (REST/Webhook, Sprint 9 — stakeholder TBD)
- AI/ML 외부 API: **금지** (사내망 전용, PRD §5.3)

### Deployment & Operations
- OS: **Ubuntu 22.04 LTS** (사내 단일 서버)
- 컨테이너: Docker Compose v2 (`restart: unless-stopped`), 7~9 서비스 (app, postgres, minio, nginx, loki, prometheus, grafana, (선택) sentry)
- Reverse Proxy: nginx 1.25-alpine + 사내 CA 인증서 (TLS 종단)
- 관측: Loki + Prometheus + Grafana (PRD §5.5 강제)
- 알림: Grafana Alert + Slack 웹훅 + SMTP
- 백업: 호스트 cron `pg_dump` + MinIO `mc mirror` → 사내 NAS, 1년 보존(Audit 5년 별도 파티셔닝)
- CI/CD: GitHub Actions 사내 self-hosted runner (Jenkins/Harbor 미도입)

---

## 3. Development Guidelines

### Version Control
- System: Git
- Repository: GitHub (https://github.com/hjh890989-web/SW_Production_Scheduling_Project)
- 브랜치 전략: Trunk-based (단일 main) + 단기 feature 브랜치
- 커밋 규칙: Conventional Commits + Task ID footer 권장 (예: `[feat] add backward scheduling (T5.3)`)

### Project Conventions
- 파일·폴더명: 영문 소문자 + kebab-case (코드), 한글 + `_v1.0` 접미사 (산출물 문서)
- Stage 산출물은 **in-place edit 금지** — `_v1.0` → `_v1.1` 새 파일 생성
- 코드 폴더는 공백·한글 회피 (`backend/`, `frontend/`, `infra/`)

### Architecture Principles
- 단일 Next.js 모노리포 (`app/`, `prisma/`, `lib/`, `infrastructure/`)
- Server Component 우선, Client Component는 인터랙션 필요한 경우만
- DB 접근은 `lib/db.ts` 단일 진입점 (Prisma client 싱글톤)
- 비즈니스 규칙은 `lib/scheduling/` 도메인 모듈로 격리 (Next.js 의존 최소화 → 향후 OR-Tools 마이크로서비스 분리 대비)

### Code Comments
- 의미 있는 주석만 작성 (WHY 중심, WHAT은 코드로 표현)
- 사용되지 않거나 쓸모없어진 주석은 즉시 제거
- 한국어 주석 허용 (도메인 용어가 한국어 기반)

### Problem Solving
- 에러/예외 처리가 필요하면 `/fix-error` 슬래시 커맨드로 구조화된 7단계 진단 수행
- 커밋·PR이 필요하면 `/conventional-commit` 커맨드 사용

---

## 4. Subagent & Command Routing

작업 성격에 따라 적합한 서브에이전트 또는 슬래시 커맨드가 자동으로 위임됩니다.
수동 호출이 필요하면 `> use the <agent-name> subagent` 또는 `/<command>` 형태로 지시하세요.

### Subagents (`.claude/agents/`, 9종)

**도메인 인식 (EVS 산출물 직접 참조)**:
| 에이전트 | 사용 시점 |
|---|---|
| `nextjs-app` | Next.js App Router 페이지·레이아웃·Server Component·Route Handler·Server Action 작업 |
| `prisma-schema` | `schema.prisma` 모델·관계·마이그레이션·시드 데이터 작업 |
| `authjs-rbac` | Auth.js v5 설정, RBAC 6 Role 정책, 미들웨어, 세션·콜백 작업 |
| `tailwind-shadcn` | Tailwind CSS + shadcn/ui 컴포넌트, 디자인 토큰, 접근성 작업 |

**스택 패턴 (Next.js 모범 사례)**:
| 에이전트 | 사용 시점 |
|---|---|
| `nextjs-frontend` | Server/Client Component, 페이지, 레이아웃, shadcn/ui (`app/**/*.tsx`, `components/**/*.tsx`) |
| `nextjs-backend` | Server Actions, Route Handlers(`app/api/**`), 비즈니스 로직, `lib/` 유틸 |
| `database` | Prisma 스키마·마이그레이션, Supabase 설정, Mock ERP 테이블. ERP 모델은 Read-Only 다층 방어 적용 |
| `ai-integration` | (Phase 2) 사내 LLM 호출 큐·Rate Limit·XAI. 외부 LLM은 D8 위배로 금지 — Phase 2 Ollama 도입 후 활성 |
| `pdf-client` | 클라이언트 사이드 PDF 생성 (`@react-pdf/renderer`, `window.print()`). 서버 사이드 PDF 금지 |

### Slash Commands (`.claude/commands/`)
| 커맨드 | 목적 |
|---|---|
| `/fix-error` | 에러/예외 발생 시 7단계 구조화 진단·수정 |
| `/conventional-commit` | Conventional Commits + Task ID 규약 준수 커밋·푸시·드래프트 PR 자동화 |

---

## 5. 사내 환경 제약

- 외부 인터넷 접근 제한 (사내망 격리). 외부 API 호출이 필요한 경우 PM 승인·프록시 경유 필수.
- 외부 LLM/AI SaaS 호출 금지 — Anthropic/OpenAI/HuggingFace 등 모든 외부 LLM API 코드에 포함 금지.
- 운영 DB의 실데이터를 로컬·외부에 export 금지. 개발은 익명화·합성 데이터 사용.
- 파일 시스템 경로에 한글·공백이 포함될 수 있음 (`e:\VS code Workbase\...`). 쉘 명령에서는 항상 큰따옴표로 인용.

---

## 6. 참고

- 새 도메인 규칙: [Stage_A/4_개발계획서_v1.3.md](Stage_A/4_개발계획서_v1.3.md) §15 의사결정 기록에 D-XX로 추가
- 새 요구사항: [Stage_C/19_PRD_v1.4.md](Stage_C/19_PRD_v1.4.md) 차기 버전(`_v1.5`)에 추가
- 새 코딩 규칙: 본 파일 §3 또는 해당 서브에이전트 정의에 반영
- 새 절차·프로세스: `.claude/commands/`에 슬래시 커맨드로 추가
