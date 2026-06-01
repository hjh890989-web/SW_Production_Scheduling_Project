---
description: EVS HITL 자동+수동 보정 철학 + RBAC 6 Role + 사내망 보안 (항상 적용, 위반 시 PR 거절)
globs: ["**/*"]
alwaysApply: true
---

# 004 — HITL & Security

> **원천**: [`Stage_A/4_개발계획서_v1.3.md`](../../Stage_A/4_개발계획서_v1.3.md) §5 (시스템 철학), §15 (의사결정 D8/D10), [`Stage_C/19_PRD_v1.4.md`](../../Stage_C/19_PRD_v1.4.md) §5.3

## HITL 핵심 철학 — D10 "자동 + 수동 보정"

**자동 백워드 스케줄링**이 1차 산출물이고, **현장 반장의 수동 보정**이 최종 산출물이다. 시스템은 절대 자동 결과를 강제하지 않는다.

| 원칙 | 구현 위치 |
|:---|:---|
| **자동 결과는 제안** | T5.2 성형 스케줄러, T6.1 압출 스케줄러 |
| **반장은 드래그·재배분 자유** | T5.6 ⭐⭐ J-MR-2 (도입 성패) |
| **룰 위반은 차단이 아닌 경고** | T5.7 빨간 토스트만, AuditLog `rule_violation=true` |
| **자동 vs 수동 시각 구분** | T5.8 회색/파란/초록 색상 코딩 |
| **"왜 이 결과?" 툴팁** | T5.9 알고리즘 근거 표시 |
| **베타 검증 필수** | [T5.12](../../Stage_D/issues/T5.12_beta-usability-test.md) 박철수·이영호 hands-on 만족도 ≥4/5 |

## RBAC 6 Role (R-13, [Stage_B 권한 매트릭스](../../Stage_B/))

| Role | 권한 요약 |
|:---|:---|
| ADMIN | 모든 권한 + 사용자 관리 |
| PRODUCTION_MANAGER | 마스터(R/W), 수주(R/W/업로드), 성형/압출(R/W/확정), Audit(R) |
| MOLDING_LEADER | 마스터(R), 성형(R/W/결과), 압출(R) |
| EXTRUSION_LEADER | 마스터(R), 성형(R), 압출(R/W/결과) |
| SALES_PURCHASE | 마스터(R), 수주(R/W/업로드) |
| EXECUTIVE | 마스터(R), 수주(R), 재고(R), 성형/압출(R), Audit(R) — **읽기 전용** |

**구현 강제**:
- middleware.ts에서 라우트 그룹별 Role 검증 (route-level)
- 각 Server Action 진입 첫 줄 `await assertRole(session, [...])` (action-level)
- 이중 방어 필수

## 보안 정책 — D8 "사내망 전용"

- **외부 인터넷 접근 제한** (사내망 격리). 외부 API 호출이 필요한 경우 PM 승인·프록시 경유 필수
- **외부 LLM/AI SaaS 호출 금지** — Anthropic/OpenAI/HuggingFace/Gemini 등 모든 외부 LLM API 코드에 포함 금지
  - 위배 skills(`302-gemini-throttle`, `305-vercel-ai-sdk-rules`)는 `.archive/` 격리됨
  - Phase 2 사내 Ollama/vLLM 도입 시 `307-local-llm-rules` 신규 작성
- **운영 DB 실데이터 export 금지** — 익명화·합성 데이터로 개발
- **Vercel/Supabase 외부 호스팅 금지** — 사내 단일 서버 전용

## 인증·세션

- **Auth.js v5** + bcrypt(cost=12)
- 비밀번호 정책: 8자 이상 + 영문 대소문자 + 숫자 + 특수문자 중 3종 이상, 90일 변경 알림
- **5회 실패 시 계정 잠금** (5분 자동 해제 또는 Admin 수동 해제)
- 세션: JWT, 8h idle 만료, `__Host-` prefix + `Secure` + `HttpOnly` + `SameSite=Strict`
- 비밀번호 변경 시 모든 세션 무효화 (`User.sessionVersion` 증가)

## AuditLog (R-13, IATF 16949)

- **모든 변경 자동 기록** (`lib/audit.ts` 통한 단일 진입점)
- 기록 필드: userId, role, action, targetTable, targetId, before, after, IP, sessionId, timestamp
- **5년 보존** — 연 단위 파티셔닝(`audit_log_2026`, `audit_log_2027` ...), 1년 초과 파티션은 `pg_dump` → NAS 압축 후 `DETACH`
- AuditLog 기록 ≤500ms NFR (T1.6 DoD)

## 보안 위반 PR 자동 거절 트리거

- 외부 LLM API URL(`generative.googleapis.com`, `api.openai.com` 등) 포함
- 환경변수에 `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` 등 직접 노출
- `lib/db.ts` 단일 진입점 우회한 Prisma client 신규 인스턴스화
- AuditLog 우회하는 직접 `prisma.xxx.update/delete` 호출 (raw query 포함)
- RBAC `assertRole` 호출 누락된 Server Action
- 비밀번호·시크릿이 로그/에러 메시지에 마스킹 없이 노출
