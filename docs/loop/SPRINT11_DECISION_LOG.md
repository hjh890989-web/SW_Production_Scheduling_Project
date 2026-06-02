# Sprint 11 (출시 준비·품질/운영) 의사결정 로그

T11 중 **코드 검증 가능분(T11.1 E2E, T11.3 CSP)** + 운영 런북(T11.OPS)만 루프로 진행.
인프라 task(T11.2 k6 / T11.4 Lighthouse / T11.5 Sentry / T11.6 Grafana / T11.7 배포 / T11.8 백업)는
이 환경에서 실행 불가 → `docs/operations.md` 런북으로 **이연(런북화)**. (사용자 승인: "코드 검증 가능분만")

CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (Sprint 범위) 인프라 task 런북 이연
- k6·Lighthouse·Sentry·Grafana·서버 배포·백업은 신규 의존성·CI 수정·물리 인프라가 필요해 자동 루프(5종 게이트)로 검증 불가.
- 기존 제약(신규 npm 의존성·`.github/workflows` 수정·외부 SaaS 금지)을 유지하고, 해당 task는 실행 없이 `docs/operations.md`에 구체 명령·설정·임계치로 문서화한다.

---

## MINOR

### MINOR-1 (T11.1) 14 스토리 E2E는 페르소나 권한별 진입·렌더 검증 중심
- 70 AC 전수 대신, 14 스토리를 seed 사용자 6역할로 매핑해 라우트 진입·핵심 UI 렌더를 Playwright로 검증(`npm run test:e2e` 분리, typecheck 게이트 포함).
- 드래그 등 복합 상호작용(MR-2 J-MR-2)은 진입점·그리드 렌더 확인으로 대표(상세 드래그는 기존 `molding.spec.ts` 보유).

---

CORE: 1
MINOR: 1
