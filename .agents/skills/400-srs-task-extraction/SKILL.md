---
name: 400-srs-task-extraction
description: SRS(소프트웨어 요구사항 명세서)에서 개발 Task를 추출하고 이슈 템플릿을 생성. "REQ-FUNC-NNN을 Task로", "이 요구사항 어떻게 쪼개지" 등 요청 시 수동 발동.
disable-model-invocation: true
---

# SRS → 개발 Task 추출

> **수동 호출**: `/400-srs-task-extraction` 또는 "SRS의 REQ-FUNC-XXX를 Task로 쪼개줘" 요청 시.

## 핵심 원리 3가지

### 1) SRS의 구조가 Task의 구조
- **Functional** → 모듈 개발 Task
- **Non-Functional (NFR)** → 성능·보안·테스트·모니터링 Task
- **Interface (API Endpoints)** → API 설계 + DTO + Zod schema + Route Handler Task
- **Data Model** → Prisma schema + Migration + Seed Task

### 2) REQ 1개 = 개발 Task 여러 개
> 예: REQ-FUNC-001 (패시브 로깅 STT) 1건 → Frontend 컴포넌트 + Server Action + Prisma 모델 + Vercel AI SDK 호출 + Zod schema + 테스트 등 6~10개 Task

### 3) Acceptance Criteria(AC) = Definition of Done (DoD)
> AC1~3이 있으면 각 항목이 별도 체크박스. 각 AC가 "측정 가능"하지 않으면 SRS 수정부터.

---

## 6단계 추출 절차

### 1단계: REQ 목록 수집
```
SRS §4 (Functional Requirements) + §5 (NFR) + §6 (Data Model)
→ REQ-FUNC-NNN 표 정리
```

### 2단계: 행위(Behavior) 분해
각 REQ를 **6가지 측면**으로 분해:
- **입력 (Input)** — Zod schema, 폼 컴포넌트
- **처리 (Process)** — Server Action, lib 유틸
- **출력 (Output)** — 응답 타입, DB 저장, UI 렌더
- **예외 (Exception)** — NAC (Negative AC), 에러 메시지
- **설정 (Configuration)** — 환경변수, 권한
- **테스트 (Test)** — 단위, 통합, E2E

### 3단계: AC → DoD 체크박스 변환
```markdown
REQ-FUNC-001 Story 1 AC:
- p95 ≤ 5초 (인식 정확도 ≥85%)
- 결측률 ≤ 5%
- 인간 승인 없이 발행 0건

→ Task DoD:
- [ ] STT API 호출 평균 ≤5초 (10회 측정)
- [ ] STT 정확도 ≥85% (테스트 셋 100건)
- [ ] LogEntry.status='PENDING_APPROVAL'로만 저장
- [ ] audit_log에 actor='ai-gemini-flash' 기록
```

### 4단계: API Endpoint → 구현 단위 분해

| 분해 결과 | 산출물 |
|---|---|
| API 명세 | `docs/api/openapi.yaml` 또는 README |
| Request schema | `lib/schemas/logEntry.ts` (Zod) |
| Response type | TypeScript type or Prisma `GetPayload` |
| Route Handler | `app/api/v1/log-entries/route.ts` |
| Server Action | `app/(dashboard)/logging/actions.ts` |
| Validation | Zod parse + RBAC guard |
| Error code | `lib/errors.ts` enum |
| 로깅 | Sentry + audit_log |
| E2E 테스트 | Playwright (Phase 2) |

### 5단계: Data Model → Prisma 작업

```
SRS §6 ERD → prisma/schema.prisma model
→ npx prisma migrate dev --name add-log-entry
→ npx prisma generate
→ seed.ts에 mock 데이터
```

### 6단계: NFR → DevOps/QA Task

```markdown
REQ-NF-001 p95 ≤ 800ms

→ 성능 Task:
- [ ] Web Vitals 측정 코드 (lib/metrics/web-vitals.ts)
- [ ] Vercel Analytics 활성화
- [ ] 부하 테스트 시나리오 (k6 스크립트)
- [ ] p95 > 800ms 알림 (Sentry)
```

---

## Issue 템플릿 (`.github/ISSUE_TEMPLATE/srs-task.md`)

```markdown
### Summary
- 기능명: [REQ-FUNC-001 패시브 로깅 STT]
- Epic: E1
- Phase: 1 (Next.js 본제품)

### Description
- SRS 참조: docs/2_SRS_V_1.0.md §4.1.1 REQ-FUNC-001
- 페르소나: COO 한성우 (현장 운영)
- HITL 영향: ⭐ AI 결과는 PENDING_APPROVAL 강제

### Acceptance Criteria (GWT)
- **Given** 작업자가 녹음 버튼을 누르고 음성을 발화한다
- **When** Gemini STT API가 호출된다 (aiQueue 경유)
- **Then** LogEntry가 status=PENDING_APPROVAL로 저장되고 audit_log에 기록된다
- **Then** 인식 정확도 ≥85%, p95 응답 ≤5초

### Negative AC (NAC)
- [ ] 비등록 언어 음성 → False Positive ≤2%
- [ ] 카메라 오염 → "재촬영 요청" 알림 ≤3초

### Sub-Tasks
- [ ] Prisma 모델 `LogEntry` 추가 + migration
- [ ] Zod schema `LogEntrySchema`
- [ ] Server Action `createLogEntry()`
- [ ] STT 호출 헬퍼 `lib/ai/stt.ts` (aiQueue 경유)
- [ ] 녹음 버튼 컴포넌트 `<RecordButton />`
- [ ] 롤백/수정 뷰어 페이지 `/dashboard/logging`
- [ ] 단위 테스트 (Vitest)
- [ ] 결측률 일별 집계 쿼리

### NFR
- p95 응답 ≤ 5s
- 인식 정확도 ≥ 85%
- 동시 5건 큐 처리, 드롭 0

### Labels
`epic:E1`, `priority:must`, `phase:1`, `hitl-impact`, `ai-integration`

### Owner
- DRI: @hjh890989-web
```

---

## 산출물 저장 위치

| 단계 | 산출물 | 경로 |
|---|---|---|
| 1 | REQ 목록 | `tasks/REQ-list.md` |
| 2 | Task Tree | `tasks/<TASK-ID>.md` (개별 파일) |
| 3 | DoD 체크리스트 | 각 Task 파일 내 |
| 4 | API 명세 | `docs/api/openapi.yaml` (또는 코드 주석) |
| 5 | Prisma | `prisma/schema.prisma`, `prisma/migrations/` |
| 6 | NFR 테스트 | `tests/nfr/`, `docs/perf-baseline.md` |

---

## 참고 — 기존 tasks/ 폴더
이미 `tasks/4.1 ~ 4.26`에 26개 task가 정리돼 있음. 신규 REQ는 `tasks/`의 기존 네이밍 컨벤션 유지.
