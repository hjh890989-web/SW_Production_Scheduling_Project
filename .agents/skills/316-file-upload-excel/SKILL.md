---
name: 316-file-upload-excel
description: Excel/CSV 드래그&드롭 파싱·적재 (REQ-FUNC-020). `app/api/v1/erp/excel-import/**`, `lib/excel/**` 또는 `multipart/form-data|xlsx|exceljs|papaparse` 키워드 작업 시 자동.
---

# File Upload & Excel/CSV Import (REQ-FUNC-020)

> **자동 발동 트리거** (좁게): `app/api/**/import/**`, `lib/excel/**` 파일, `xlsx|exceljs|papaparse|multipart` import 시.

REQ-FUNC-020 — ERP API 불가 시 엑셀 덤프 드래그&드롭 파싱·적재 (≥95% 성공률, ≤30초/파일). REQ-FUNC-023 — 50MB 초과/비표준 인코딩 거부 (≤3초 응답).

---

## 1. 라이브러리 선택

| 라이브러리 | 형식 | 장점 | 단점 |
|---|---|---|---|
| `xlsx` (SheetJS) | `.xlsx`, `.xls`, `.csv` | 범용, 빠름, 가벼움 | 메모리 (큰 파일은 streaming 어려움) |
| `exceljs` | `.xlsx` | 스트리밍 읽기·쓰기, 스타일 풍부 | 무거움 |
| `papaparse` | `.csv` | CSV 전용 최강, 스트리밍 OK | xlsx 미지원 |

**권장**: 
- MVP: `xlsx` 단일 + `papaparse` for 큰 CSV
- Phase 2 (대용량): `exceljs` 스트리밍

```bash
npm install xlsx papaparse
npm install -D @types/papaparse
```

---

## 2. Server Action / Route Handler 골격

### Server Action (작은 파일, 폼 통합)
```ts
'use server'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAction, actor } from '@/lib/audit'
import { ValidationError, tryAction } from '@/lib/errors'

const MAX_SIZE_BYTES = 10 * 1024 * 1024                          // 10MB (Server Action 한도)
const ALLOWED_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // .xlsx
  'application/vnd.ms-excel',                                            // .xls
  'text/csv',
])

const RowSchema = z.object({
  itemCode: z.string().min(1).max(50),
  itemName: z.string().min(1).max(200),
  quantity: z.coerce.number().nonnegative(),
})

export async function importInventoryExcel(formData: FormData) {
  return tryAction(async () => {
    const session = await requireRole(['ADMIN', 'OPERATOR'])
    const file = formData.get('file')
    if (!(file instanceof File)) throw new ValidationError('파일이 첨부되지 않았습니다.')

    // REQ-FUNC-023: 사이즈/MIME 검증
    if (file.size > MAX_SIZE_BYTES) {
      throw new ValidationError(`파일 크기가 ${MAX_SIZE_BYTES / 1024 / 1024}MB를 초과합니다.`)
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      throw new ValidationError(`지원하지 않는 파일 형식입니다. (xlsx/xls/csv만 허용)`)
    }

    // 파싱
    const buf = await file.arrayBuffer()
    let rows: unknown[]
    try {
      const wb = XLSX.read(buf, { type: 'array', codepage: 65001 })   // UTF-8 강제
      const sheet = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
    } catch (e) {
      throw new ValidationError('파일을 파싱할 수 없습니다. 형식·인코딩(UTF-8) 확인 후 재업로드.', { cause: String(e) })
    }

    if (rows.length === 0) throw new ValidationError('비어 있는 파일입니다.')
    if (rows.length > 10_000) throw new ValidationError('10,000 행을 초과합니다. 분할하여 업로드.')

    // 검증·적재 (실패 행 리포트)
    const ok: any[] = []
    const failed: Array<{ row: number; reason: string }> = []
    for (let i = 0; i < rows.length; i++) {
      const parsed = RowSchema.safeParse(rows[i])
      if (parsed.success) ok.push(parsed.data)
      else failed.push({ row: i + 2, reason: parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') })  // +2 = header + 1-based
    }

    // Prisma bulk insert (chunk)
    const CHUNK = 500
    for (let i = 0; i < ok.length; i += CHUNK) {
      await prisma.inventorySnapshot.createMany({
        data: ok.slice(i, i + CHUNK).map(r => ({ ...r, importedById: session.user.id })),
        skipDuplicates: true,
      })
    }

    await logAction({
      actor: actor.user(session.user.id),
      action: 'IMPORT',
      target: { type: 'InventorySnapshot', id: 'batch-' + Date.now() },
      after: { fileName: file.name, total: rows.length, ok: ok.length, failed: failed.length },
    })

    return { total: rows.length, imported: ok.length, failed }
  })
}
```

### Route Handler (대용량, CSV streaming)
```ts
// app/api/v1/erp/csv-import/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'                                    // Edge 금지 (큰 파일)

const MAX_SIZE = 50 * 1024 * 1024                                  // 50MB (Route Handler가 처리)

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN', 'OPERATOR'])

    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: { code: 'FILE_TOO_LARGE', message: '50MB 초과는 분할 업로드.' }}, { status: 413 })
    }

    const text = await req.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })

    if (parsed.errors.length > 0) {
      return NextResponse.json({
        error: { code: 'PARSE_ERROR', message: 'CSV 파싱 실패', details: parsed.errors.slice(0, 5) }
      }, { status: 400 })
    }

    // 적재 로직 동일
    return NextResponse.json({ data: { count: parsed.data.length }})
  } catch (err) {
    return apiError(err)
  }
}
```

---

## 3. 클라이언트 — 드래그&드롭 + 진행률

```tsx
'use client'
import { useState } from 'react'
import { importInventoryExcel } from './actions'

export function ExcelDropzone() {
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file) return
        setBusy(true)
        const fd = new FormData()
        fd.append('file', file)
        const res = await importInventoryExcel(fd)
        setBusy(false)
        setResult(res)
      }}
      className="border-2 border-dashed rounded-lg p-8 text-center"
    >
      {busy ? '업로드 중…' : '여기에 .xlsx 또는 .csv 파일을 드롭'}
      {result?.ok && (
        <div className="mt-4">
          <p>총 {result.data.total} 행 / 성공 {result.data.imported} / 실패 {result.data.failed.length}</p>
          {result.data.failed.slice(0, 10).map((f: any) => <p key={f.row}>행 {f.row}: {f.reason}</p>)}
        </div>
      )}
    </div>
  )
}
```

---

## 4. 인코딩·BOM 처리

- 엑셀이 만든 CSV는 종종 **UTF-8 BOM** (`EF BB BF`) 포함
- `XLSX.read(buf, { codepage: 65001 })` 또는 CSV는 직접 strip:

```ts
function stripBom(s: string) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s
}
```

- CP949 (옛 엑셀, Windows 한글) 지원 필요 시:
```ts
import iconv from 'iconv-lite'
const text = iconv.decode(Buffer.from(buf), 'cp949')
```

---

## 5. 보안

- **MIME 검증만 신뢰 금지** — 확장자도 함께 (`!file.name.endsWith('.xlsx')` 등)
- **매크로 차단** — `.xlsm`, `.xls` (Macro 가능 형식) 거부 또는 추가 검사
- **파일명에 PII 가능성** — `audit_log`에는 마스킹된 fileName 저장
- **바이러스 스캔** — Phase 2 (ClamAV / 외부 서비스). MVP는 신뢰 가능한 사용자만 사용 (RBAC OPERATOR+)

---

## 6. PR 체크리스트
- [ ] 사이즈 검증 (Server Action 10MB / Route Handler 50MB)
- [ ] MIME + 확장자 이중 검증
- [ ] Zod row schema로 행별 검증
- [ ] 실패 행 리포트 (`{ row, reason }[]`) 반환
- [ ] Prisma `createMany` + chunk 500
- [ ] `IMPORT` audit_log 기록
- [ ] runtime = nodejs (Edge 금지)
- [ ] 한글 파일명 정상 처리 확인 (UTF-8)

## See also
- `310-server-action-patterns` — FormData/File 처리
- `311-route-handler-patterns` — 대용량 streaming
- `313-audit-log-helper` — `IMPORT` action
- `318-prisma-transactions` — 부분 실패 시 rollback 전략
