---
name: ciso-security-review
description: CISO 보안 심의 동행 체크리스트 — SVC-3 서비스의 사전 준비 문서·심의 PT·후속 조치
---

# CISO Security Review — SVC-3

> **트리거**: PoC 계약 직후 또는 CISO 보안 심의 요청 시.

본 워크플로우는 **SVC-3 (보안 심의 동행 PT + 사전 문서)** 서비스의 표준 절차이며, CISO 첫 3건 전수 통과(보조 KPI 보조-4)를 목표로 한다.

## 0. 트리거 조건
- 신규 PoC 고객사 결정 (≥2주 전)
- CISO 측에서 보안 심의 요청
- ISMS 등 인증 갱신 시점

## 1. 사전 자료 준비 (D-14)

| 문서 | 위치 | 책임 |
|---|---|---|
| 시스템 아키텍처 다이어그램 | `docs/architecture/system.mmd` (Mermaid) | DevOps |
| 데이터 흐름 다이어그램 (DFD) | `docs/architecture/data-flow.mmd` | DevOps |
| ERP Read-Only 보장 증빙 | `.agents/rules/004-hitl-and-security.md` §2 + 코드 grep 결과 | Security Reviewer |
| HITL 4대 원칙 구현 증빙 | `.agents/rules/004-hitl-and-security.md` §1 + `audit_log` 샘플 | AI Integration |
| RBAC 매트릭스 | `docs/security/rbac-matrix.md` (역할 × 자원) | Backend |
| 감사 로그 샘플 (1주치) | Supabase export CSV | DevOps |
| 외부 트래픽 검증 (PROD: 0 byte) | Network 모니터링 캡처 (Phase 2) | DevOps |
| 비밀 관리 정책 | `docs/security/secret-management.md` | DevOps |
| CVE 스캔 리포트 | `npm audit`, Snyk, GitHub Dependabot | DevOps |
| 백업·복구 정책 | `docs/security/backup-recovery.md` | DevOps |
| Sub-processor 목록 | Vercel, Supabase, Google (Gemini) | Legal |

## 2. 심의 PT 슬라이드 골격 (D-7)

1. **사업 개요** (5분) — FactoryAI 소개, 2차 자동화 공백 해소
2. **아키텍처** (10분) — Next.js + Supabase + Gemini, 데이터 흐름
3. **HITL 4대 원칙** (10분) — AI 단독 실행 0건 보장 증빙
4. **ERP Read-Only** (5분) — 3중 방어 (Schema/Middleware/DB user)
5. **무료 티어 → PROD 전환 계획** (5분) — Ollama 로컬화 로드맵
6. **데이터 처리** (10분) — PII 마스킹, 1년 audit 보관, GDPR/PIPA
7. **외부 의존성** (5분) — Sub-processor 5종 + DPA 체결 여부
8. **사고 대응** (5분) — RTO/RPO, Sentry, 보안 운영자 연락 체계
9. **Q&A** (15분)

## 3. 예상 질문 + 답변 시트 (D-3)

| 질문 | 답변 위치 |
|---|---|
| "Gemini API에 우리 데이터가 학습됨?" | Google Cloud 명시 — 무료 티어는 학습 가능, **유료 전환 후 학습 옵트아웃 가능** (Vertex AI). PoC는 무료, 본격 운영 전 유료 전환 약속 |
| "ERP DB에 영향?" | Layer 1 (별도 DB user SELECT only) + Layer 2 (Prisma middleware) + Layer 3 (CI grep). **3중 방어** |
| "AI 오판으로 외부 발행되면?" | HITL 4대 원칙 — AI 결과는 PENDING_APPROVAL 상태로만 저장, 사람 승인 없이는 외부 효과 0건. `audit_log` 전수 기록 |
| "Cloud 의존도 너무 높음" | MVP는 Vercel/Supabase Free, **Phase 2(PROD)는 Docker Compose On-Premise로 전환**. ADR-1 |
| "백업·DR 계획?" | Supabase 자동 백업 (Free Tier 7일), 1주 1회 export to S3 (Phase 2) |
| "사고 시 누구한테?" | DRI: `hjh890989@gmail.com`, SLA 24h 답변 (PoC 기간) |

## 4. 심의 당일

- 자료 PDF로 사전 제공 (D-1)
- PT 진행 (60분)
- Q&A 기록 → 즉답 가능한 것 그 자리에서, 나머지는 D+3 추가 자료 약속
- 합의된 보완 사항 메모

## 5. 후속 조치 (D+3 ~ D+7)

- Q&A 보완 자료 제출
- 합의된 보안 정책 반영 (코드/문서)
- CISO 승인서 확보 → `docs/security/ciso-approvals/<customer>-<date>.pdf` 보관
- `보조-4 CISO 보안 심의 승인률` KPI 갱신

## 6. 실패 시 대응

- 어떤 항목으로 거절됐는지 명확히 기록
- 30일 내 보완 후 재심의 시도
- 패턴화되는 거절 사유는 `docs/security/learnings.md`에 누적 → 다음 고객사 PT 보완

## 산출물

- 각 PoC별 심의 패키지 → `docs/security/<customer>/<date>/`
- 통합 승인률 KPI → `docs/security/ciso-kpi.csv`
