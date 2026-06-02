# Sprint 7 (T7.1~T7.5) 자동화 루프 의사결정 로그

`/goal` Sprint 7 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델·도메인 알고리즘) / **MINOR**(네이밍·디렉터리·UI 디테일).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 1
MINOR: 1

---

## CORE 결정

### CORE-1 — 영향 시뮬은 순수 함수 dryRun(ephemeral), DB 변경 없음
- **결정**: `simulateImpact(change, schedules)`는 신규 모델 없이 입력 스케줄 배열에서 영향받는 항목을 식별·분류만 한다(DB write 없음, R-8). 변경 매칭은 itemId 기준(+옵션 deliveryDate)으로 같은 품번의 기존 MoldingSchedule·ExtrusionSchedule 항목을 영향 대상으로 본다.
- **status 분류 → 색상**: STARTED/COMPLETED→🔴(현장 확인), CONFIRMED→🟡(재계산 가능), AUTO/MANUAL→🟢(자동 재계산). MES 미연동이라 STARTED/COMPLETED는 현재 데이터에 없을 수 있어 빈 집합 가능(Degraded Mode 안내).
- **근거**: ≤5초 응답·dryRun 보장, 진행중 건은 차단·변경하지 않고 식별·경고만.

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍
- 시뮬 로직 `lib/scheduler/impact-simulator.ts`(순수), 색상/유틸 `lib/impact/`, W-3 패널은 T3.8 `app/(dashboard)/orders/change/`에 추가, 하이라이트는 W-4/W-5 그리드 컴포넌트 재사용.

---
