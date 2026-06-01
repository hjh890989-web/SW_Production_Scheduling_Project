---
description: 에러/예외 발생 시 7단계 구조화된 진단·수정 프로세스 수행
argument-hint: [에러 메시지 또는 파일:라인]
allowed-tools: Read, Edit, Grep, Glob, Bash
---

# Error Fixing Process (EVS)

대상: **$ARGUMENTS**

아래 7단계를 순서대로 수행하고 각 단계 결과를 짧게 요약해 보고하세요. 본 프로젝트의 도메인·스택 컨텍스트는 루트 `CLAUDE.md`를 참조하세요.

## Step 1: 현상 정의 (Phenomenon Definition)
- 관찰된 증상을 정확히 기술 (에러 메시지·스택트레이스 원문 그대로).
- 재현 조건: 어떤 페이지/액션, 어떤 사용자 role, 어떤 데이터.
- 환경: 개발(SQLite) / 운영(PostgreSQL) / 둘 다.

## Step 2: 맥락·범위 탐색 (Contextual Scope Exploration)
- `Grep`/`Glob`으로 관련 심볼·파일·라우트 매핑.
- Next.js: Server Component / Client Component / Server Action 어디인지 식별.
- Prisma: 어떤 모델·쿼리·트랜잭션과 연관되는지.
- Auth.js: 미들웨어·세션·RBAC 검증 단계 확인.

## Step 3: 문제 핵심 특정 (Problem Core Specification)
- 근본 원인을 증거 기반으로 좁힘.
- 가설이 여러 개라면 각각의 근거·반증 나열.
- 본 프로젝트 흔한 함정 우선 검토:
  - SQLite ↔ PostgreSQL 차이 (enum, JSON, citext)
  - Server Component에서 클라이언트 전용 API 사용
  - Server Action에 `'use server'` 누락
  - `auth()` 호출 누락으로 세션 미인증 상태에서 진행
  - Prisma client 다중 인스턴스화 (dev hot reload)
  - 한글/공백 경로 인용 누락

## Step 4: 중급 개발자 눈높이 요약
- 전문용어 최소화. "무엇이 왜 잘못되었는가" 를 한 문단으로.

## Step 5: 수정 포인트 강조 (Highlight Fix Points)
- 수정 필요 부분을 목록화하고 파일:라인 명시.
- 영향 범위 (다른 라우트·다른 모듈에 미치는 영향) 표시.

## Step 6: 코드 수정 수행 (Perform Code Fix)
- 원저자 의도를 보존하며 깔끔하게 수정.
- 한 번에 한 가지 일 — 불필요한 리팩터링 동반 금지.
- DB 스키마 변경이 필요하면 사용자 확인 후 `prisma-schema` 에이전트로 위임.
- 권한 정책 변경이 필요하면 `authjs-rbac` 에이전트로 위임.

## Step 7: 후속 개선 제안 (Propose Follow-up Improvements)
- 테스트 추가 (Vitest unit / Playwright E2E)
- AuditLog 보강 (보안·추적성 사고였다면)
- 로깅 보강 (Pino 구조화 로그 → Loki)
- 별도 작업으로 제시. 즉시 반영은 사용자 승인 후.

## 주의
- 운영(prod)에서 재현된 사고면 즉시 Slack 알림과 함께 `git revert` 옵션을 우선 검토.
- 비밀번호·시크릿·PII가 로그/에러 메시지에 포함되어 있으면 마스킹 후 보고.
- AuditLog 5년 보존 정책 위반 가능성이 있는 수정은 반드시 사용자 확인.
