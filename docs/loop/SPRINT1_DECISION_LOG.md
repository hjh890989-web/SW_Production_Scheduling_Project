# Sprint 1 (T1.1~T1.8) 자동화 루프 의사결정 로그

이 파일은 `/goal` Sprint 1 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존) / **MINOR**(네이밍·디렉터리·UI 디테일·로그 포맷).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 4
MINOR: 3

---

## CORE 결정

### CORE-1 — Role enum을 UPPER_SNAKE 페르소나 기반으로 채택
- **결정**: 6 Role을 `ADMIN, PRODUCTION_MANAGER, MOLDING_LEADER, EXTRUSION_LEADER, SALES_PURCHASE, EXECUTIVE`로 정의.
- **배경**: 기존 T0.5 스켈레톤 `auth.ts`는 `Admin/Manager/Sales/Material/ExtrusionForeman/MoldingForeman`(CamelCase)를 사용했고 CLAUDE.md §2도 이를 명시. 그러나 더 최신·구체 산출물인 Stage_D 이슈(T1.2 AC `MOLDING_LEADER`, T1.7 시드 6 사용자 Role)는 페르소나 기반 UPPER_SNAKE를 사용.
- **근거**: Stage_D 이슈 명세가 시드 사용자·AC와 직접 결합되어 있어 권위 우선. 단일 소스로 통일해야 RBAC 매트릭스/시드/E2E가 일관됨.
- **영향 범위**: `auth.ts`, `lib/permissions.ts`, `prisma/schema.prisma` User.role default, `prisma/seed.ts`.

### CORE-2 — 세션 전략은 JWT 유지 (DB Session 미채택)
- **결정**: Auth.js v5 세션 전략 `jwt` 유지 (`maxAge = 8h`).
- **배경**: T1.1 명세는 "DB Session 권장(Audit 추적 용이)"이라 적시. 그러나 Auth.js v5 **Credentials provider는 database session 전략을 지원하지 않음**(JWT 강제).
- **근거**: 프레임워크 제약. Audit 추적성은 DB 세션 대신 `events.signIn`/명시적 `logAudit` 호출 + JWT의 `jti`/sessionVersion으로 확보. 향후 LDAP/SSO 전환 시 재검토.
- **영향 범위**: `auth.ts` session.strategy, audit 기록 경로.

### CORE-3 — 비밀번호 해시 라이브러리는 `bcryptjs`(순수 JS) 사용
- **결정**: 네이티브 `bcrypt` 대신 `bcryptjs` 채택, 12 rounds 유지.
- **배경**: 이슈는 `bcrypt` 12 rounds를 명시. 네이티브 bcrypt는 node-gyp/빌드 툴체인 의존.
- **근거**: 사내 단일 Ubuntu 서버·Docker 멀티스테이지 빌드에서 네이티브 컴파일 의존성을 제거하면 이식성·재현성↑. bcryptjs는 동일 bcrypt 알고리즘·동일 round 비용, API 호환. 성능(≤100ms@12rounds) 충족.
- **영향 범위**: `package.json` deps, `lib/auth/password.ts`, `prisma/seed.ts`.

### CORE-4 — 로그인 식별자는 `username`(사번/아이디), email 아님
- **결정**: User에 `username String @unique` 추가, 로그인은 username 기준. `email`은 `String?`(보조 연락처)로 완화.
- **배경**: T1.4는 "아이디(id) ≥ 3자" 입력을 명시하고 T1.7 시드는 `admin`/`kimms`/`parkcs` 등 username 형태 ID를 사용. 기존 T1.1은 email 기준 조회였음.
- **근거**: 사내 공장 사용자(반장 등 IT 저숙련)는 email보다 사번/아이디 로그인이 자연스럽고 시드 데이터와 일치. Credentials authorize를 username 조회로 변경.
- **영향 범위**: `prisma/schema.prisma`(username 필드), `auth.ts`(authorize·credentials), `lib/auth/login-schema.ts`, `prisma/seed.ts`(T1.7).

---

## MINOR 결정

### MINOR-1 — 단위 테스트는 Vitest, `npm test`에 연결
- **결정**: 이슈가 요구하는 Vitest를 도입하고 `npm test` 스크립트를 `vitest run`으로 교체. Playwright E2E(T1.8)는 별도 `test:e2e` 스크립트로 분리(5종 검증 게이트의 `npm test`에는 미포함 — 라이브 서버·시드 DB 필요).
- **분류 근거**: 테스트 러너는 이슈에서 이미 지정(신규 결정 아님)이나, `npm test` 배선·E2E 분리는 로그 포맷/구성 수준의 MINOR.

### MINOR-2 — 디렉터리 컨벤션
- **결정**: 인증 도메인 유틸은 `lib/auth/`(password.ts, password-policy.ts, lockout.ts), RBAC는 `lib/permissions.ts`, audit는 `lib/audit.ts`. 라우트 그룹은 `app/(auth)/`, `app/(dashboard)/`.

### MINOR-3 — T1.8 CI 워크플로 파일 생성 보류 (goal 제약)
- **결정**: T1.8 명세는 `.github/workflows/e2e.yml` CI 워크플로를 요구하나, 본 /goal Section 4가 `.github/workflows/`를 **수정 금지**로 지정하여 **생성하지 않음**. Playwright 설정(`playwright.config.ts`)·E2E 스펙(`tests/e2e/auth.spec.ts`)·`npm run test:e2e` 스크립트만 제공.
- **근거**: goal 제약이 이슈 DoD보다 우선. CI 통합은 별도 PR(권한 보유자)에서 진행 권장.
- **영향**: T1.8 PR에서 CI 자동 실행 미포함을 명시.

---
