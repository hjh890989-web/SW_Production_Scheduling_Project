# Sprint 10 (영림원 ERP 연동·F-1.1) 의사결정 로그

T10.1~T10.4 자동화 루프(`/goal`)의 명세 미확정 결정 기록. CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T10.1) 실 ERP는 Mock 귀결 + fallback 체인은 순수 함수로 확정 (TBD-2)
- 실 영림원 표준 API 사양(TBD-2) 미확정 → `ErpClientApi`/`ErpClientDb` 실 구현 불가, 외부 호출/DB 접속 코드 미작성.
- 선택·fallback 우선순위 [api → db → mock]를 `resolveErpSource` 순수 함수로 확정해 테스트(AC T10.1-F1: API 미응답 → DB fallback).
- 동작 구현체는 `ErpClientMock`. 인터페이스(`IErpClient`)·타입(`types.ts`)에 후속 task가 의존.

---

## MINOR

### MINOR-1 (T10.1) ERP는 Item 마스터의 읽기 소스 — 역기입 금지
- 동기화 방향은 ERP→Item 단방향(품번·고객사코드·화성코드·소재). ERP/Mock 테이블 역기입 없음(CON-02).

### MINOR-2 (T10.2) 변경분만 upsert + API key 인증(`x-erp-api-key`)
- `computeItemChanges`로 달라진 필드만 update, 동일하면 쓰기 생략(불필요 audit·쓰기 방지). 신규는 create(material 기본 silicone).
- 동기화 엔드포인트는 내부/cron 호출 — `x-erp-api-key`(env `ERP_API_KEY`) 인증, 빈 env면 401.
- ERP 다운 시 503 + `erp_sync_failed` audit + Admin Notification(다음 cron 재시도).

### MINOR-3 (T10.3) 야간 cron은 UTC 환산 + 통합 등록 엔트리
- node-cron은 서버 TZ 기준이라 03:00 KST를 `0 18 * * *`(UTC)로 고정. `kstHourToUtcCron` 순수 함수로 환산·테스트.
- `registerScheduledJobs()`로 KSF(T4.4)·MES(T9.5)·ERP를 한 곳에서 등록(빌드/테스트 시 미실행). 기존 cron 함수는 재사용만(수정 없음).

---

CORE: 1
MINOR: 3
