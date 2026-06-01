---
name: 401-req-traceability
description: REQ-FUNC-NNN ↔ 코드/테스트/PR 추적 매트릭스 작성·조회. "REQ-FUNC-XXX 어디서 구현됨", "이 코드는 어떤 요구사항?" 등 요청 시 수동 발동.
disable-model-invocation: true
---

# REQ Traceability

> **수동 호출**: `/401-req-traceability` 또는 "추적표 보여줘"·"REQ-FUNC-XXX 어디?" 요청 시.

## 목적

- **양방향 추적**: REQ → 코드 / 코드 → REQ.
- **감사 대비**: 정부 사업 평가, ISO/IEC/IEEE 29148:2018 추적성 요구.
- **변경 영향 분석**: REQ 수정 시 영향받는 코드 즉시 식별.

---

## 표기 규약

### 1. 코드에 REQ 인용

**Prisma 모델 / Server Action / Route Handler 상단**:
```ts
/**
 * @req REQ-FUNC-001, REQ-FUNC-003
 * @epic E1
 * @nfr REQ-NF-001 (p95 ≤ 800ms)
 */
'use server'
export async function createLogEntry(formData: FormData) {
  // ...
}
```

### 2. 커밋 메시지

```
feat(logging): implement passive STT capture

Refs REQ-FUNC-001, REQ-FUNC-003
Closes #42
```

### 3. PR 본문

```markdown
## Summary
패시브 로깅 STT 1단계 구현.

## SRS 매핑
- ✅ REQ-FUNC-001 (음성 → 텍스트 변환)
- ✅ REQ-FUNC-003 (롤백/수정 뷰어)
- ⏳ REQ-FUNC-005 (비등록 언어 무시 — Phase 2)

## NFR
- p95 응답 4.2초 (목표 5초)
- 인식 정확도 88% (목표 85%)
```

### 4. 테스트 이름

```ts
describe('REQ-FUNC-001 — 패시브 STT 로깅', () => {
  it('AC-1: 음성을 5초 내 텍스트로 변환', async () => { ... })
  it('NAC-1: 비등록 언어는 무시', async () => { ... })
})
```

---

## 추적 매트릭스 자동 생성

### 명령
```bash
# REQ 코드 검색
grep -rn "@req REQ-FUNC-001" app/ lib/ prisma/

# 모든 REQ 인용 한꺼번에
grep -rnE "@req\s+REQ-(FUNC|NF)-\d+" app/ lib/ prisma/ tests/ \
  | awk -F: '{print $3, $1":"$2}' \
  | sort
```

### 산출 예 (`docs/traceability.md`)

| REQ ID | 코드 위치 | 테스트 | 커밋 |
|:---|:---|:---|:---|
| REQ-FUNC-001 | `app/(dashboard)/logging/actions.ts:14`, `lib/ai/stt.ts:8` | `tests/logging.test.ts:12` | `a1b2c3d` |
| REQ-FUNC-002 | `app/(dashboard)/logging/components/CameraCapture.tsx:22` | `tests/vision.test.ts:5` | `e4f5g6h` |
| REQ-FUNC-003 | `app/(dashboard)/logging/page.tsx:8` | `tests/rollback.test.ts:18` | `i7j8k9l` |
| REQ-FUNC-004 | `app/api/v1/log-entries/missing-rate/route.ts:5` | — | `m0n1o2p` |

이 표는 수동 또는 GitHub Actions로 자동 생성 (Phase 2).

---

## REQ 영향 분석 (역방향)

```bash
# "이 파일이 어떤 REQ를 구현?"
grep -E "@req\s+REQ-" app/(dashboard)/logging/actions.ts

# "이 함수의 callers는?"
grep -rn "createLogEntry" app/ components/
```

---

## DRI 매핑

각 REQ는 책임자(DRI) 명시:

```yaml
# docs/req-owners.yaml
REQ-FUNC-001: hjh890989-web
REQ-FUNC-009: hjh890989-web
REQ-NF-001: hjh890989-web
REQ-NF-004: hjh890989-web  # security
```

---

## 상태 표기

```yaml
# docs/req-status.yaml
REQ-FUNC-001:
  status: DONE       # TODO | IN_PROGRESS | DONE | BLOCKED | DEFERRED
  phase: 1
  pr: 42
  test_coverage: 90%

REQ-FUNC-024:
  status: DEFERRED
  reason: "E5 데이터 3개월 축적 후 시작"
  phase: 2
```

---

## 권장 워크플로우

1. **새 기능 시작 전**: SRS §4에서 해당 REQ 발췌 → Issue 생성 (Skill `/400-srs-task-extraction`).
2. **구현 중**: 모든 새 파일·함수 상단에 `@req` 주석.
3. **커밋**: `Refs REQ-FUNC-NNN` 인용.
4. **PR**: SRS 매핑 체크리스트 포함.
5. **머지 후**: `docs/req-status.yaml` 갱신.
6. **분기 감사**: `docs/traceability.md` 재생성, DRI별 진척 리뷰.

---

## 참조

- ISO/IEC/IEEE 29148:2018 §6.4.4 Traceability
- SRS v0.8 §4 (REQ-FUNC), §5 (REQ-NF)
- 기존 tasks 폴더 (`tasks/4.1 ~ 4.26`) — 이미 REQ 인용 패턴 사용 중
