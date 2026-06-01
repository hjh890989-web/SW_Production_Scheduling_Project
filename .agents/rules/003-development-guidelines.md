---
description: FactoryAI 개발 표준·아키텍처 원칙·코드 스타일 (항상 적용)
globs: ["**/*"]
alwaysApply: true
---

# 003 — Development Guidelines

> **원천**: [`docs/2_SRS_V_1.0.md`](../../docs/2_SRS_V_1.0.md) SRS v0.8 §5 (NFR) / §10 (ADR)

## 1. Code Style

### 1.1 TypeScript
- **Strict 모드** 강제. `tsconfig.json`에서 `strict: true`, `noUncheckedIndexedAccess: true`.
- **`any` 금지**. 모르겠으면 `unknown` 받은 뒤 narrowing.
- 함수 시그니처: 반환 타입 명시 권장 (특히 export되는 함수).
- 타입 vs 인터페이스: **객체 모양은 `type`**, 클래스 계약은 `interface` (Next.js 컨벤션).

### 1.2 React / Next.js
- **함수형 컴포넌트만**. `class` 컴포넌트 금지.
- **Server Component 기본**, `'use client'`는 인터랙션 경계에서만.
- `const` 화살표 함수 선호. `function` 선언은 export default 또는 hoisting 필요 시.
- **Early return**으로 중첩 줄이기.
- **이벤트 핸들러**: `handleClick`, `handleSubmit` 등 `handle` prefix.
- **Hook 규칙**: 최상위에서만 호출. 조건부 호출 금지.

### 1.3 Tailwind / shadcn/ui
- **Tailwind 클래스 전용**. 인라인 `style`, 별도 `.css` 파일 금지 (디자인 토큰 제외).
- **조건부 클래스**: `clsx` 또는 `cn()` 유틸. 삼항 연산자 지양.
- **shadcn/ui 컴포넌트**: 직접 수정 OK (vendoring). 변경 시 출처 주석 한 줄.

### 1.4 명명 규칙
| 대상 | 규칙 | 예 |
|:---|:---|:---|
| 컴포넌트 | PascalCase | `LotMergeButton.tsx` |
| 훅 | `use` prefix, camelCase | `useAuditReport.ts` |
| 유틸 함수 | camelCase | `formatCurrency.ts` |
| 상수 | UPPER_SNAKE | `MAX_PDF_PAGES` |
| 타입/인터페이스 | PascalCase | `type AuditReport` |
| API 라우트 | kebab-case | `app/api/v1/audit-reports/route.ts` |
| Prisma 모델 | PascalCase (단수) | `model AuditReport` |
| DB 테이블 | snake_case (Prisma `@@map`) | `@@map("audit_reports")` |

### 1.5 주석
- **WHY만 작성**. WHAT은 코드로 표현.
- **한 줄 원칙**. 멀티라인 주석은 ADR로 분리.
- **TODO/FIXME**는 이슈 번호와 함께: `// TODO(#42): Phase 2 — Ollama 전환 후 제거`.
- 변경 이력 주석 (`// 2026-05-16 modified by X`) 금지. Git이 책임짐.

---

## 2. Architecture Principles

### 2.1 단일 모놀리스 (No Microservices in MVP)
- 모든 비즈니스 로직은 Server Action 또는 Route Handler 내부.
- 외부 백엔드 호출 금지 (Gemini, Supabase 외).

### 2.2 서버/클라이언트 경계
| 책임 | 위치 |
|:---|:---|
| DB 쿼리 (Prisma) | Server Action / Route Handler / `lib/` |
| Gemini API 호출 | Server Action / `lib/ai/` |
| 비밀키 사용 | 서버 전용 (`process.env.X`, `NEXT_PUBLIC_*` 외) |
| 폼 검증 (1차) | 클라이언트 (UX) |
| 폼 검증 (최종) | 서버 (보안) |
| PDF 생성 | **클라이언트** (CON-07) |

### 2.3 Rate Limit & Throttle (R3 강제)
모든 Gemini 호출은 `lib/ai/queue.ts`의 In-memory Queue를 경유.

```typescript
// 예시 패턴
await aiQueue.enqueue(() => generateText({ model, prompt }))
// → 큐 내부에서 ≤12 RPM throttle + Exponential Backoff
```

직접 `generateText`/`streamText` 호출 금지 — 룰 위반 시 PR 거절.

### 2.4 Error Handling
- **시스템 경계**(외부 API, 사용자 입력)에서만 `try/catch`.
- 내부 함수 호출은 신뢰. 방어적 코드 (`if (!x) return null` 남발) 지양.
- 사용자에게 노출되는 에러는 한국어 친화 메시지 + 영문 원본 로그.
- **HITL 위반 가능 에러**(예: 자동 재시도 후 데이터 발행)는 즉시 throw, 사용자 알림.

### 2.5 DRY vs WET
- 3회 이상 반복되면 추출. 2회 이하는 inline.
- 추상화 비용 > 절약 비용이면 추상화 보류.
- 가독성 > 짧은 코드.

---

## 3. Performance Standards (NFR)

| 항목 | 목표 (p95) | 측정 |
|:---|:---:|:---|
| Wizard 단계 전환 | < 800ms | Web Vitals (LCP/INP) |
| 감사 리포트 생성 | < 10s | 클라이언트 timer |
| AI XAI 응답 | < 5s | Vercel AI SDK 자체 measure |
| Server Action 응답 | < 2s | Vercel logs |
| DB 쿼리 (단순) | < 200ms | Prisma `$queryRaw` 분석 |

> **무료 티어 제약**: Vercel Serverless 단일 호출 ≤10초. 초과 위험 작업은 클라이언트 처리 또는 분할.

---

## 4. Version Control

### 4.1 Branch Model (간소화 Git Flow)
- `main` — 프로덕션 (Vercel auto-deploy)
- `develop` — 통합 브랜치 (옵션, 1인 개발에서는 생략 가능)
- `feature/<TASK-ID>-<slug>` — 기능 개발
- `fix/<TASK-ID>-<slug>` — 버그 수정
- `hotfix/<slug>` — 긴급 패치

### 4.2 Commit Message (Conventional Commits)
```
<type>(<scope>): <subject>

[body 옵션]
[footer 옵션 — BREAKING CHANGE, Closes #N]
```

| type | 사용처 |
|:---|:---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `chore` | 빌드/설정/의존성 |
| `docs` | 문서 |
| `refactor` | 리팩터링 (동작 변화 없음) |
| `test` | 테스트 추가/수정 |
| `perf` | 성능 개선 |
| `style` | 포매팅 |

**원자성**: 한 커밋 = 한 논리 단위. 무관한 변경 섞지 말 것.

### 4.3 PR 정책
- 본문에 SRS 요구사항 ID (FR-XXX) 인용.
- Checklist: 빌드 통과, lint 통과, 타입 체크 통과, HITL 영향 검토.
- 1인 개발이라도 self-review 의식 (1일 후 머지 권장).

---

## 5. Development Priorities (충돌 시 우선순위)

1. **Accuracy** — 재무·감사 데이터 계산은 결함 0. LLM에 맡기지 말 것.
2. **Compliance** — 정부 양식 100% 호환 (HWP/PDF).
3. **User Safety** — Auto-save <10s, 데이터 손실 방지.
4. **Security** — HITL, Read-Only ERP, RBAC.
5. **Performance** — NFR 충족.
6. **DX** — 유지보수성, 가독성.

---

## See also

- [001-project-overview.md](001-project-overview.md)
- [002-tech-stack.md](002-tech-stack.md)
- [004-hitl-and-security.md](004-hitl-and-security.md)
