---
name: 303-client-side-pdf
description: PDF 생성·리포트 출력 코드 작성 시 자동 발동. CON-07·ASM-09 강제 — Vercel 10초 타임아웃 회피를 위해 PDF는 반드시 클라이언트 브라우저에서 생성.
---

# Client-Side PDF Generation (CON-07)

> **왜 이 skill이 존재하는가 (백엔드 관점)**: 본 skill은 **백엔드 부담을 완화하는 전략**이다. Vercel Serverless 10초 한도(CON-07)·100k 호출/월(CON-12)을 회피하기 위해 PDF 렌더링을 클라이언트로 이전한다. **백엔드 dev는 PDF 데이터 추출 API(예: `GET /api/v1/audit-reports/{id}`)만 구현하고, 렌더링은 클라이언트가 담당한다**는 분업을 명확히 인지해야 한다. 즉 이 skill은 프론트엔드 가이드이지만 **백엔드 설계 결정의 한 축**이다.

> **자동 발동 트리거** (좁게): 파일 경로가 `components/reports/**`, `app/**/print/**`, 또는 `@react-pdf` import 시.

## 제약 (SRS CON-07 / ASM-09)

| 항목 | 값 |
|---|---|
| Vercel Serverless 실행 한도 | 10초 |
| 무료 호출 한도 | 100,000/월 |
| 일반적 PDF 생성 시간 | 5~30초 (페이지 수에 따라) |
| **결론** | **서버 PDF 생성 금지. 모든 PDF는 클라이언트 브라우저에서** |

---

## 두 가지 표준 패턴

### Pattern 1: `@react-pdf/renderer` (브라우저 모드)

- **장점**: React 컴포넌트로 PDF 정의. 디자인 자유도 높음.
- **단점**: 번들 사이즈 큼 (~500KB). 폰트 임베딩 필요 (한글).

```tsx
// components/reports/AuditReportPdf.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Pretendard',
  src: '/fonts/Pretendard-Regular.ttf',
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Pretendard', fontSize: 11 },
  title: { fontSize: 16, marginBottom: 12 },
  table: { display: 'flex', flexDirection: 'column', marginTop: 8 },
  row: { flexDirection: 'row', borderBottom: '1px solid #ddd', padding: 4 },
  cell: { flex: 1 },
})

export function AuditReportPdf({ report }: { report: AuditReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>감사 리포트 — {report.title}</Text>
        <View style={styles.table}>
          {report.lots.map(lot => (
            <View key={lot.id} style={styles.row}>
              <Text style={styles.cell}>{lot.code}</Text>
              <Text style={styles.cell}>{lot.startedAt.toLocaleString('ko-KR')}</Text>
              <Text style={styles.cell}>{lot.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
```

```tsx
// 사용 (클라이언트 컴포넌트)
'use client'
import dynamic from 'next/dynamic'
import { AuditReportPdf } from './AuditReportPdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
)

export function DownloadButton({ report }: { report: AuditReport }) {
  return (
    <PDFDownloadLink document={<AuditReportPdf report={report} />} fileName={`audit-${report.id}.pdf`}>
      {({ loading }) => (loading ? '생성 중...' : 'PDF 다운로드')}
    </PDFDownloadLink>
  )
}
```

> **중요**: `@react-pdf/renderer`는 SSR 시 에러 → 반드시 `dynamic(import, { ssr: false })`.

### Pattern 2: `window.print()` + CSS `@media print`

- **장점**: 의존성 0. 브라우저 인쇄 다이얼로그로 PDF 저장.
- **단점**: 인쇄 다이얼로그가 뜸 (UX 차이). 정밀 페이지 제어 어려움.

```tsx
'use client'
export function PrintButton() {
  return <button onClick={() => window.print()}>PDF로 저장 (인쇄 → PDF)</button>
}
```

```css
/* app/globals.css */
@media print {
  .no-print { display: none !important; }
  .page-break { page-break-after: always; }
  body { background: white; color: black; }
  a { color: inherit; text-decoration: none; }
}

@page {
  size: A4 portrait;
  margin: 15mm;
}
```

---

## 어느 패턴을 선택?

| 시나리오 | 권장 |
|---|---|
| 디자인 정밀 제어 필요, 다국어/표/이미지 풍부 | Pattern 1 (`@react-pdf/renderer`) |
| 기존 React 화면을 그대로 인쇄 | Pattern 2 (`window.print()`) |
| 모바일 사용자 (인쇄 다이얼로그 거부감) | Pattern 1 |
| 빠른 프로토타입, MVP 첫 버전 | Pattern 2 |

---

## ❌ 금지 패턴 — 서버에서 PDF

```ts
// ❌ 절대 금지 — Vercel 10초 타임아웃 위험
'use server'
import puppeteer from 'puppeteer'        // ❌

export async function generatePdf() {
  const browser = await puppeteer.launch()  // ❌ Vercel 환경 미지원 + 메모리 초과
  // ...
}
```

```ts
// ❌ 서버 react-pdf 렌더링
import { renderToBuffer } from '@react-pdf/renderer'  // ❌
const buffer = await renderToBuffer(<AuditReportPdf />)  // 10초 초과 위험
```

---

## Phase 2 옵션 (PROD On-Premise)

PROD에서는 Docker 컨테이너 내 PDF 서비스 가능:
- `@react-pdf/renderer` 서버 렌더링 OK (타임아웃 제약 없음)
- 또는 Puppeteer 컨테이너 (`browserless/chrome`)

단, MVP에서는 클라이언트 전용 패턴 유지.

---

## 위반 시
- PR 리뷰: 서버 PDF 코드 발견 시 거절.
- CI 추후: `grep -rE "(puppeteer|playwright|renderToBuffer)" app/ lib/` 발견 시 빌드 실패.
