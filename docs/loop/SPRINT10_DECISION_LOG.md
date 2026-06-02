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

---

CORE: 1
MINOR: 1
