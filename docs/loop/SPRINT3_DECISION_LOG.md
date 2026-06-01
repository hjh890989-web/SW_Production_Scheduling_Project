# Sprint 3 (T3.1~T3.9) 자동화 루프 의사결정 로그

`/goal` Sprint 3 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델) / **MINOR**(네이밍·디렉터리·UI 디테일·로그 포맷).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 3
MINOR: 1

---

## CORE 결정

### CORE-1 — 수주 모델 설계(Order/ExcelMappingRule/Notification) + enum류 String
- **결정**: T3.1에서 `Order`·`ExcelMappingRule`·`Notification` 3모델을 한 번에 추가(이후 task는 이 위에 스택).
  - `Order`: itemId(FK·nullable 아님, 매칭된 것만 적재), rawProductCode, deliveryDate, quantity, orderType, sourceType, confidence, status, uploadBatchId.
  - enum류(`orderType` OEM/KD, `sourceType` weekly_plan/kd/monthly_forecast, `confidence` CONFIRMED/FORECAST/MIXED, `status` ACTIVE/SUPERSEDED/CHANGED/CANCELLED)는 Sprint 2 CORE-1과 동일하게 **String + TS union 검증**(SQLite enum 미지원).
- **근거**: 모든 다운스트림 task(필터·우선순위·UI)가 공유. 한 번에 추가해 스택 충돌 최소화.

### CORE-2 — 파서 구조: (file→matrix)와 (matrix→rows) 분리, xlsx 재사용
- **결정**: 각 파서는 `parseXxx(matrix: CellValue[][]): ParseResult` 순수 함수 + 얇은 `readSheetMatrix(file, sheet)` 헬퍼로 분리. 단위 테스트는 합성 matrix로 결정적 검증(실 엑셀 파일 비의존). 엑셀 읽기는 기존 `xlsx` 재사용(exceljs 미추가).
- **근거**: 실 엑셀 파일 의존 없이 unpivot·매핑 로직을 테스트(5종 게이트 결정성). 실 파일은 개발 중 검증용으로만 파싱.

### CORE-3 — 우선순위 룰 정책(품번 단위)
- **결정**: 품번 단위로 그룹 후 ① weekly_plan 존재 시 weekly만 ACTIVE·나머지 SUPERSEDED, ② weekly 없으면 가장 빠른 납기 1건 ACTIVE(동일 납기는 weekly>kd>forecast 우선순위로 결정).
- **근거**: AC T3.5-1(주간 truth)·T3.5-2(빠른 납기)·F1(deterministic) 충족. KD는 orderType='KD'로 트랙 보존(R-4).

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 컨벤션 (Sprint 3)
- 파서·ETL `lib/etl/`, 수주 도메인 로직 `lib/orders/`(types·filter·priority·actions), 수주 화면 `app/(dashboard)/orders/{upload,change}/`, 매핑 GUI `app/(dashboard)/master/mapping/`. 파일 업로드는 react-dropzone 대신 네이티브 input 사용(의존성 최소화).

---
