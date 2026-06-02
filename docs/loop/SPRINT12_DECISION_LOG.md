# Sprint 12 (Phase 2 — 코드 가능분 + 어댑터) 의사결정 로그

범위(사용자 승인 "코드 가능 전부 + 어댑터"): 12.6 자재확대 + 12.5 PWA + 솔버/LLM 어댑터·토글.
외부 실서비스(Python OR-Tools 솔버 12.1.1/2/4·12.2.x, Ollama 12.7.1/3/4, AD/LDAP 12.4.x, 솔버 부하·정확도 12.3.3/4)는 미가동 → `docs/operations-phase2.md` 런북 **이연**.

CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T12.6.1) 자재는 String 유지 + 앱 레벨 정규화(마이그레이션 0)
- SQLite enum 미지원·기존 silicone 무결성 위해 `material`은 String 유지, `lib/material/`에서 union(silicone/EPDM/NBR)·정규화·검증.
- 미상/빈값은 기본 silicone → 기존 데이터 영향 없음(AC T12.6.1-1). 스키마 변경 없어 db push 불필요.

### CORE-2 (T12.5.1) PWA는 신규 의존성 없이 수동 구현
- next-pwa/Workbox 미도입(사내망·신규 의존성 금지) → `public/manifest.webmanifest`+`public/sw.js`(stale-while-revalidate) 수동 작성, 클라이언트 등록.
- 캐시/오프라인 판정은 `lib/pwa/strategy.ts` 순수 함수로 테스트, SW 자체는 빌드 산출물 정적 제공.

---

## MINOR

### MINOR-1 (T12.5.2) 모바일 KSF는 별도 라우트 `/mobile` + 최신 2스냅샷 추세
- 데스크톱 대시보드(W-1)와 분리된 모바일 우선 카드 뷰. KsfDailySnapshot 최신 2건으로 전일 대비 추세.
- 포맷·추세 판정은 `lib/ksf/format.ts` 순수 함수로 테스트.

---

### CORE-3 (T12.1.3) 솔버 엔진은 추상화 + Mock 귀결 (Python OR-Tools 미가동)
- `ISolverEngine` 인터페이스 + `SolverEngineMock` + 팩토리(env `SOLVER_URL`, timeout 30s, zod 응답 스키마).
- 실 OR-Tools 마이크로서비스(Phase 2, 12.1.1/2/4·12.2.x)는 미가동 → 실 HTTP 호출 코드 미작성, Mock 귀결. 후속 W-4/5 토글(12.3.1)이 본 추상화에 의존.

---

### CORE-4 (T12.7.2) LLM provider 추상화 + Mock (사내 Ollama 미가동, 외부 LLM 금지)
- `ILlmProvider` 인터페이스 + `MockLlmProvider` + 팩토리(env `OLLAMA_URL`). 외부 호출·네트워크 없음(D8 외부 LLM SaaS 금지 준수).
- 실 추론은 Phase 2 사내 Ollama(12.7.1/3/4) 도입 후 OllamaProvider로 교체 → 현재 Mock 귀결.

---

CORE: 4
MINOR: 1
