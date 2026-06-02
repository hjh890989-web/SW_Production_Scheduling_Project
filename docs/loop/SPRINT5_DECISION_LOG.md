# Sprint 5 (T5.1~T5.12) 자동화 루프 의사결정 로그

`/goal` Sprint 5 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델·도메인 알고리즘) / **MINOR**(네이밍·디렉터리·UI 디테일).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 2
MINOR: 1

---

## CORE 결정

### CORE-1 — W-4는 frappe-gantt 대신 커스텀 슬롯 그리드(신규 의존성 없음)
- **결정**: T0.8/CORE-5에서 frappe-gantt를 채택했으나 실제 미설치 상태였고, W-4는 task-timeline이 아니라 **가류기×슬롯×(주/야)×영업일 슬롯 그리드**라 frappe-gantt와 구조가 맞지 않는다. 신규 의존성 없이 **커스텀 HTML 그리드**(`components/molding/schedule-grid.tsx`)로 구현하고, 도메인→그리드 변환은 `lib/gantt/adapter.ts`로 분리.
- **근거**: 슬롯 드래그 재배분(T5.6)·셀 단위 색상/툴팁(T5.5/T5.9)은 커스텀 그리드가 더 단순·정확. 사내망 번들 영향·SSR 경계 리스크 제거. /goal Section 4에서 명시 허용.

### CORE-2 — 슬롯 적격성 도출(제한적 마스터 데이터)
- **결정**: Item에 위치별 O/X가 lpPosTop만 있으므로 `deriveSchedulerItem`에서 ① 저압(lpMoldsPerAngle>0): LP 슬롯 중 TOP은 lpPosTop일 때만 허용 ② IC(icMoldsPerAngle>0): IC 슬롯 전부 ③ 둘 다 0: 성형 불가(경고). 회전 capacity는 lp_rotation_day/night 파라미터 사용.
- **근거**: 슬롯 X 0건 보장을 위해 적격 슬롯만 입력. 위치별 O/X 전면 마스터 도입 시 교체.

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 컨벤션 (Sprint 5)
- 스케줄러 `lib/scheduler/`(types·molding-scheduler), 그리드 어댑터 `lib/gantt/`, W-4 화면 `app/(dashboard)/molding/`, 그리드 컴포넌트 `components/molding/`, 베타 테스트 플랜 `docs/`.

---

STOP REASON: ALL_PRS_DONE (T5.1~T5.12 12개 draft PR 모두 생성 — PR #45~#56)
