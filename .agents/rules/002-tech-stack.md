---
description: EVS 기술 스택 (Next.js 14+ / Prisma / Auth.js v5 / PostgreSQL / Docker) 항상 적용
globs: ["**/*"]
alwaysApply: true
---

# 002 — Tech Stack

> **원천**: [`Stage_A/4_개발계획서_v1.3.md`](../../Stage_A/4_개발계획서_v1.3.md) §13 (하이브리드 스택 + Cloud-Ready), [`Stage_C/19_PRD_v1.4.md`](../../Stage_C/19_PRD_v1.4.md) 부록 B

## Frontend

- **Framework**: Next.js 14+ **App Router** (`output: 'standalone'`)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 3.x
- **Component Library**: shadcn/ui (Radix UI 기반)
- **상태/폼**: React Server Components + Server Actions, 클라이언트 폼은 React Hook Form + zod
- **차트**: Recharts 또는 Visx (KPI 대시보드 — 결정 보류)
- **간트**: [T0.8](../../Stage_D/issues/T0.8_gantt-library-poc.md) PoC 결과 (ADR D-23)

## Backend

- **Runtime**: Node.js 20 LTS
- **API**: Next.js Route Handlers + Server Actions (별도 백엔드 서버 없음 — D19 하이브리드 모노리포)
- **ORM**: **Prisma**
- **Database (dev)**: SQLite (`prisma/dev.db`)
- **Database (prod)**: **PostgreSQL 16** (사내 단일 인스턴스)
- **객체 저장소**: MinIO (S3 호환) — 첨부·PDF 출력물
- **배치/스케줄러**: 호스트 cron (백업·아카이빙) + Node-cron (앱 내부)
- **최적화 엔진 (Phase 2)**: Python + **OR-Tools** 마이크로서비스 (Sprint 12.1~12.3)

## Authentication & Authorization

- **Auth.js v5** (NextAuth 후속) — Credentials provider + bcrypt(12)
- 사내 LDAP 연동은 **Phase 2 ([T12.4](../../Stage_D/issues/T12.4.1_ad-ldap-review.md), ADR D-26)**
- **RBAC 6 Role**: ADMIN / PRODUCTION_MANAGER / SALES_PURCHASE / MATERIAL / EXTRUSION_LEADER / MOLDING_LEADER / EXECUTIVE (R-13)
- 5회 실패 시 계정 잠금, 세션 8h idle, secure cookie + SameSite=Strict + AuditLog IP/sessionId

## External Integrations

- **영림원 ERP**: 수주 헤더 마스터 (REST, Sprint 10 — TBD-2 사양 미정)
- **자체 MES**: 작업실적 동기화 (REST/Webhook, Sprint 9 — TBD-3 stakeholder 미정)
- **AI/ML 외부 API**: **금지** (D8 사내망 전용, PRD §5.3) — 위배 skills(`302-gemini-throttle`, `305-vercel-ai-sdk-rules`)는 `.archive/`로 격리됨

## Deployment & Operations

- **OS**: Ubuntu 22.04 LTS (사내 단일 서버)
- **컨테이너**: Docker Compose v2 (`restart: unless-stopped`), 7~9 서비스 (app + postgres + minio + nginx + loki + prometheus + grafana + (선택) sentry)
- **Reverse Proxy**: nginx 1.25-alpine + 사내 CA 인증서 (TLS 종단)
- **관측**: Loki + Prometheus + Grafana (PRD §5.5 강제, 자체호스팅)
- **알림**: Grafana Alert + Slack 웹훅 + SMTP
- **백업**: 호스트 cron `pg_dump` + MinIO `mc mirror` → 사내 NAS, 1년 보존 (Audit 5년 별도 파티셔닝)
- **CI/CD**: GitHub Actions 사내 self-hosted runner (Jenkins/Harbor 미도입)

## 의사결정 추적

| 결정 | 내용 |
|---|---|
| D-8 | 사내망 전용 (외부 SaaS·LLM 금지) |
| D-19 | 하이브리드 스택 (Next.js + Prisma 단일 모노리포) |
| D-20 | Cloud-Ready 12-Factor (향후 클라우드 이전 옵션) |
| D-22 | TBD-5 시뮬레이션 인터뷰 1차 종결 ([ADR](../../Stage_C/22_ADR_D22_TBD5종결_v1.0.md)) |
| D-23 | 간트 라이브러리 선정 (T0.8 결과로 결정 — 보류) |
| D-24 | (예약) J-MR-2 재설계 — T5.12 박철수 만족도 <4/5 시 발의 |
| D-25 | KSF-3 단위 이원화 (5분 perceived / 5초 server) ([ADR](../../Stage_C/23_ADR_D25_KSF3단위명확화_v1.0.md)) |
| D-26 | (예약) LDAP 연동 방식 (T12.4.1) |
