---
name: 100-error-fixing-process
description: 에러/예외 발생 시 7단계 구조화 진단·수정 프로세스. FactoryAI 스택(Next.js + Prisma + Gemini)에 특화된 디버깅 절차.
---

# 100 — Error Fixing Process (7-Step)

> 이 스킬은 에러 메시지나 비정상 동작이 보고되었을 때 무작위 추측 없이 **증거 기반으로 근본 원인을 좁히는** 절차입니다.

---

## Step 1 — 현상 정의 (Phenomenon Definition)

- 관찰된 증상을 그대로 기록한다 (에러 메시지 원문, 스택트레이스).
- 재현 조건: 어떤 사용자가 어떤 동작을 했을 때 발생했는가.
- 예상 결과 vs 실제 결과를 한 줄로 대비.

> ❌ "로그인이 안 돼요" → ✅ "OPERATOR 역할 사용자가 /api/v1/auth/login POST 시 500 응답. 응답 body: `{ error: 'TypeError: Cannot read properties of undefined (reading id)' }`. Vercel logs에 동일 스택트레이스 확인됨."

## Step 2 — 맥락·범위 탐색 (Contextual Scope Exploration)

- 관련 파일·데이터 흐름·호출 경로를 지도화한다.
- 사용 도구:
  - `Grep`/`rg`: 심볼 사용처 찾기
  - `git log -p <file>`: 최근 변경 이력
  - Vercel Dashboard / Supabase Dashboard: 로그·쿼리
  - Sentry (있다면): 에러 frequency, breadcrumb
- 외부 시스템 연계 시 SRS §3.1 EXT-01~09 표를 확인.

## Step 3 — 문제 핵심 특정 (Problem Core Specification)

- 근본 원인을 **증거 기반**으로 좁힌다.
- 가설이 여러 개면 각각의 근거·반증을 나열한다.
- 가능하면 minimal reproduction 코드 추출.

> 가설 1: NextAuth 세션 만료 → 반증: Vercel logs에 401 아니라 500
> 가설 2: Prisma 클라이언트 미초기화 → 근거: 첫 cold start에만 발생, 후속 요청은 정상
> 가설 3: `getServerSession()` 반환 타입 미스매치 → 근거: 스택트레이스가 `lib/rbac.ts:42`를 가리킴

## Step 4 — 중급 개발자 눈높이 요약

- 전문용어 최소화. "왜 잘못되었는가"를 한 문단으로.
- 누가 읽어도 이해할 수 있게.

## Step 5 — 수정 포인트 강조

- 수정 필요 위치를 **파일:라인**으로 명시.
- 각 포인트의 이유.

> - `lib/rbac.ts:42` — `session.user` undefined 가드 누락
> - `app/api/v1/auth/login/route.ts:18` — 빈 응답 시 throw 대신 401 반환
> - (선택) `lib/errors.ts` — `UnauthenticatedError` 클래스 추가 검토

## Step 6 — 코드 수정 수행

- 원저자 의도 보존.
- **한 번에 한 가지 일** — 무관한 리팩터링 섞지 않는다.
- HITL/RBAC/Read-Only ERP 같은 절대 룰 영향 확인.
- 수정 후 빌드·타입체크·lint·테스트 (있다면).

## Step 7 — 후속 개선 제안

- 테스트 추가, 로깅 보강, 리팩터링 제안.
- 당장 반영하지 않고 별도 작업으로 제시 (TODO 또는 issue).

---

## FactoryAI 스택 특화 디버깅

### Next.js / Vercel
- **빌드 에러**: `tsc --noEmit` 로 타입 에러 따로 확인.
- **Hydration 미스매치**: Server/Client 컴포넌트 경계 확인. `'use client'` 누락?
- **Vercel 10초 타임아웃**: Function logs에서 `Function Execution Timed Out` 확인. 분할 또는 클라이언트로.
- **환경변수 누락**: `vercel env ls` 또는 `.env.local` 확인.

### Prisma / Supabase
- **`P2002 Unique constraint failed`**: 중복 키. catch해서 한국어 메시지.
- **`P2025 Record not found`**: 404 처리.
- **Connection timeout**: `DATABASE_URL` 의 `pgbouncer=true` 누락? `connection_limit` 조정?
- **Free Tier 한도**: 500MB 근접 시 audit_logs/Storage 정리.

### Gemini API
- **`429 RESOURCE_EXHAUSTED`**: Rate Limit. 큐 미경유 호출 점검 (`grep -r 'generateText\|streamText' lib/ai/` 에서 `aiQueue.enqueue` 사용 확인).
- **`400 INVALID_ARGUMENT`**: prompt 형식 또는 토큰 한도 초과. `maxTokens` 조정.
- **Empty response**: 안전 필터 발동. `prompt` 검토.

### HITL/RBAC 위반 에러
- **`RBAC_DENIED`**: `requireRole` 가드 메시지. 사용자 역할 확인.
- **`ERP_WRITE_FORBIDDEN`**: ERP 모델 write 시도. 코드를 read-only로 수정.
- **PENDING_APPROVAL 우회 시도**: 즉시 PR reject + 룰 가이드 링크.

---

## 사용 예 (Claude Code)

```
/fix-error TypeError: Cannot read properties of undefined (reading 'id') at lib/rbac.ts:42
```

→ 위 7단계를 순서대로 실행하고 각 단계 결과를 요약 보고.

---

## 사용 예 (Cursor)

채팅창에서 자동 매칭 또는 `@100-error-fixing-process` 로 수동 호출.

---

## See also

- [.agents/rules/004-hitl-and-security.md](../../rules/004-hitl-and-security.md) — 보안 영향 에러 대응
- Claude Code에서는 `.claude/skills/` Junction을 통해 `/100-error-fixing-process`로 호출
