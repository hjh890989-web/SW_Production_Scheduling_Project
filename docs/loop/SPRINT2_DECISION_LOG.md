# Sprint 2 (T2.1~T2.9) 자동화 루프 의사결정 로그

`/goal` Sprint 2 자동화 루프에서 **이슈 명세에 확정되지 않은 추가 의사결정**을 기록한다.
분류: **CORE**(아키텍처·보안·외부의존·데이터모델) / **MINOR**(네이밍·디렉터리·UI 디테일·로그 포맷).

<!-- grep 가능한 카운터 (각 결정 추가 시 갱신) -->
CORE: 4
MINOR: 1

---

## CORE 결정

### CORE-1 — SQLite 미지원으로 enum류 필드는 String + 앱 레벨 검증
- **결정**: SlotPosition·Equipment.type·CalendarDay.type·OperationParam 등 "enum"으로 명세된 필드를 Prisma `enum` 대신 `String`으로 정의하고, TS union 타입 + Zod로 앱 레벨에서 검증한다.
- **배경**: dev DB가 SQLite(`prisma/schema.prisma` datasource sqlite). Prisma는 **SQLite에서 native enum을 지원하지 않음**. 운영 PostgreSQL 전환 시 enum 승격 가능.
- **근거**: 단일 스키마로 dev(SQLite)/prod(PG) 양립. 검증은 `lib/`의 union+Zod로 일관 강제. T2.2-F1(잘못된 SlotPosition)·T2.7 범위 검증은 앱 레벨에서 처리.
- **영향**: 모든 Sprint 2 모델, 검증 유틸.

### CORE-2 — 품번 정규화 규칙(normalizeProductCode)
- **결정**: `normalizeProductCode(input)` = 모든 비영숫자 문자(공백·하이픈·슬래시 등) 제거 후 소문자화. 예: `"A 672 203 17 02"` → `a6722031702`, `"25474-2S010"` → `254742s010`.
- **배경**: T2.9 명세 AC가 "룰에 따라"로 열어둠. 다양한 표기를 단일 키로 통일 필요.
- **근거**: 가장 단순·결정적이며 공백/하이픈/슬래시 변형을 모두 흡수. ItemAlias에 normalized 키를 저장해 매칭.
- **영향**: `lib/etl/normalizer.ts`, `ItemAlias.normalized`, 시드 매칭(T2.1).

### CORE-3 — T2.1 품번 시드: 실제 엑셀 합집합(47) + 결정적 보정
- **결정**: `Raw Materials`의 압출(46품번)·성형(46품번) 시트를 파싱해 **합집합 47품번**을 `prisma/data/items.json`으로 추출(`prisma/extract-items.mjs`), 시드는 이 JSON을 읽어 upsert. 런타임에 xlsx 의존 제거.
- **결정적 보정**: ① `extrusionGroup`(E열 1-8)은 엑셀에 해당 컬럼이 없어 정렬 인덱스 기반 `(i%8)+1` 버킷으로 부여. ② 성형 전용 1품번의 `headPin`은 최빈값 `22*8`로 채움(AC "headPin 비어있는 행 0건" 충족). 나머지 필드(cutLength·speed·extruder·lp/ic molds·lpPosTop)는 엑셀 실값.
- **근거**: 두 시트의 품번 불일치(교집합 45)와 E그룹 출처 컬럼 부재로 완전 1:1 매핑이 모호. 합집합+결정적 보정이 "47품번·모든 행 E그룹/headPin non-empty" AC를 충족하면서 실데이터를 최대한 보존. 개발/테스트 시드 용도.
- **영향**: `prisma/extract-items.mjs`(추출), `prisma/data/items.json`(커밋), `prisma/seed-items.ts`, `prisma/seed.ts`.

### CORE-4 — 한국 공휴일 수동 매핑(2026~2027), 외부 라이브러리 미사용
- **결정**: `holidays-kr` 등 외부 라이브러리 대신 `lib/master/calendar.ts`의 `KOREAN_HOLIDAYS`에 2026~2027 공휴일(음력 설날·추석·석가탄신일 포함)을 수동 매핑.
- **배경**: T2.4 명세가 라이브러리 또는 수동 매핑 허용. 사내망·결정성·의존 최소화 관점에서 수동이 안전.
- **근거**: 외부 패키지 추가 없이 결정적. 음력 공휴일은 연도별 직접 지정(연장 시 재검증 필요, 대체공휴일 미포함은 향후 보강).
- **영향**: `lib/master/calendar.ts`, `prisma/seed-calendar.ts`.

---

## MINOR 결정

### MINOR-1 — 디렉터리/네이밍 컨벤션 (Sprint 2)
- ETL 유틸 `lib/etl/`, 마스터 도메인 `lib/master/`, 시드 분리 `prisma/seed-*.ts`, 마스터 화면 `app/(dashboard)/master/{items,equipment,parameters,calendar}/`.

---
