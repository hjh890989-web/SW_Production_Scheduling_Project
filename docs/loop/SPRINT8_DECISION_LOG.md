# Sprint 8 (출력·F-6) 의사결정 로그

T8.1~T8.4 자동화 루프(`/goal`)의 명세 미확정 결정 기록. CORE=아키텍처·보안·외부의존, MINOR=네이밍·UI·로그 포맷.

---

## CORE

### CORE-1 (T8.1) 엑셀 라이브러리: exceljs 대신 기존 xlsx 재사용
- 명세(T8.1)는 `exceljs` 사용을 권하나, 사내망·자체호스팅 제약상 신규 npm 의존성 추가를 피한다.
- Sprint 3에서 이미 도입된 `xlsx@0.18.5`(`lib/etl/excel.ts` 등)를 재사용해 다운로드 워크북을 생성한다.
- aoa_to_sheet 기반 시트 생성으로 명세의 시트 구조(성형/압출 일자별 + 요약) 요구를 충족.

### CORE-2 (T8.2/T8.3) PDF: react-pdf/puppeteer 대신 window.print() + A4 인쇄 CSS
- 명세(T8.2)는 react-pdf 또는 puppeteer를 언급하나, CLAUDE.md(pdf-client, CON-07) 서버 PDF 금지·신규 의존성 금지 원칙에 따른다.
- 전용 인쇄 라우트(`@media print` A4 레이아웃, 큰 글씨)를 `window.print()`로 출력해 클라이언트 PDF를 갈음한다.

---

## MINOR

### MINOR-1 (T8.1) 시트명 규약 `M월D일(성형)` / `M월D일(압출)` + 요약
- 명세 출력 형식(`*월*일(성형)·(압출)`)을 따라 일자별 시트명을 `2월2일(성형)`처럼 생성.
- 전체 합계는 `요약` 시트 1장으로 집계.

### MINOR-2 (T8.2) QR 코드: 신규 의존성 없이 작업지시 ID 텍스트로 갈음
- 명세(T8.2)의 QR 코드는 "추후 MES 연동" 단서가 있어, 지금은 QR 라이브러리 도입 없이 결정적 작업지시 ID(`WI-YYYYMMDD-{M|E}-{line}`)를 인쇄면에 텍스트로 표기.
- Sprint 9 MES 연동 시 동일 ID를 QR로 인코딩하도록 확장 여지 남김.

### MINOR-3 (T8.3) 도입일(Before/After 경계)·디스크 부족 처리
- 도입일은 `OperationParam.adoption_date`(없으면 분기 시작일)에서 읽어 Before/After를 가른다.
- 시계열 차트는 신규 의존성 없이 커스텀 SVG(라인)로 그린다(KSF-1 납기율).
- AC EX-2-F1(디스크 부족) 대비: 서버 PDF를 쓰지 않으므로(CORE-2) 서버 임시파일·디스크 점유가 없어 디스크 부족 실패 경로 자체가 제거됨(클라이언트 인쇄). 결정 기록.

---

CORE: 2
MINOR: 3
