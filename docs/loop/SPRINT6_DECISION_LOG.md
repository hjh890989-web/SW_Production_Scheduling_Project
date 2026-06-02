# Sprint 6 (T6.1~T6.7) 자동화 루프 의사결정 로그

`/goal` Sprint 6 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델·도메인 알고리즘) / **MINOR**(네이밍·디렉터리·UI 디테일).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 1
MINOR: 1

---

## CORE 결정

### CORE-1 — 압출 스케줄러 그룹화 알고리즘 + ExtrusionSchedule 모델
- **결정**: `generateExtrusionSchedule`는 (extrusionGroup, headPin)로 묶어 **그룹 단위로 같은 압출기·연속 셀에 backward 채움** → 다이/노즐 변경(셋업) 최소화. 신규(NEW) 호환 시 신규 우선, 아니면 포드(FORD). 효율(75%)을 셀 용량에 반영. 배치 일자는 관체 deadline(성형투입-1, D-1) 이내.
- **모델**: `ExtrusionSchedule`(weekStart·date·shift(DAY_FIRST/DAY_SECOND/NIGHT_FIRST/NIGHT_SECOND)·extruderId·itemId·quantity·extrusionGroup·headPin·status·ruleViolation). enum류 String.
- **근거**: 동일 그룹을 한 셀/연속 셀에 모으면 setup change가 그룹 경계에서만 발생 → KSF-2 -30% 시뮬 충족.

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 + 차트 커스텀 SVG
- 압출 스케줄러 `lib/scheduler/extrusion-scheduler.ts`, 압출 도메인 `lib/extrusion/`(die-change·color 등), W-5 화면 `app/(dashboard)/extrusion/`. T6.5 부하 그래프는 Recharts 대신 **커스텀 SVG/바**(신규 의존성 0). 그리드/드래그는 Sprint 5(`lib/gantt`, `move-*`) 패턴 재사용.

---
