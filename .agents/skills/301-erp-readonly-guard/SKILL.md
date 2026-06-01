---
name: 301-erp-readonly-guard
description: ERP 데이터 접근 코드 작성 시 자동 발동. CON-02 강제 — Write/Update/Delete 차단을 3중 방어로 구현. Mock ERP 포함 모든 ERP 모델에 적용.
---

# ERP Read-Only Guard (CON-02)

> **자동 발동 트리거**: 다음 키워드 포함 코드 작성 시.
> - `erp`, `더존`, `영림원`, `iCUBE`, `Smart A`, `K-System`
> - `erpPrisma`, `MockErp`, `ERP_*`
> - Prisma model 이름이 `Erp*` prefix 또는 `@@map("erp_*")` 접두

## 핵심 제약 (SRS CON-02 / ADR-2)

ERP 연동은 **Read-Only만**. Write/Update/Delete는 **시스템 레벨에서 차단**. Mock ERP(MVP)와 실제 ERP(PROD-Phase 2) **동일하게 적용**.

---

## 3중 방어 (Layered Defense)

### Layer 1: 별도 Prisma Datasource
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

datasource erpDb {
  provider = "postgresql"
  url      = env("ERP_READONLY_URL")  // 읽기 전용 DB 사용자
}
```

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()

import { PrismaClient as ErpClient } from '@prisma/erp-client'
export const erpPrisma = new ErpClient()
```

### Layer 2: Prisma Middleware
```ts
// lib/erp/middleware.ts
const WRITE_ACTIONS = new Set([
  'create', 'createMany',
  'update', 'updateMany',
  'delete', 'deleteMany',
  'upsert',
])

erpPrisma.$use(async (params, next) => {
  if (WRITE_ACTIONS.has(params.action)) {
    throw new Error(
      `ERP_WRITE_FORBIDDEN: model=${params.model} action=${params.action} (CON-02 Read-Only)`
    )
  }
  return next(params)
})
```

### Layer 3: DB 사용자 권한
- Supabase/PostgreSQL ERP 스키마에 대해 **SELECT만** 부여한 사용자로 접속.
- 애플리케이션이 미들웨어를 우회해도 DB 레벨에서 거부.

```sql
-- 예: erp_readonly 사용자 생성
CREATE ROLE erp_readonly WITH LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA erp TO erp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA erp TO erp_readonly;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA erp FROM erp_readonly;
```

---

## 허용/금지 패턴

### ✅ 허용
```ts
// 읽기
const inventory = await erpPrisma.erpInventory.findMany({
  where: { warehouseId: 'W01' },
})

const orderCount = await erpPrisma.erpOrder.count()

const result = await erpPrisma.$queryRaw`SELECT * FROM erp.inventory LIMIT 10`
```

### ❌ 금지
```ts
// 어떤 Write 작업도 차단됨 — 런타임 throw
await erpPrisma.erpInventory.create({ data: ... })       // ❌
await erpPrisma.erpInventory.update({ where, data })     // ❌
await erpPrisma.erpInventory.delete({ where })           // ❌
await erpPrisma.$executeRaw`UPDATE erp.inventory SET ...` // ❌

// "Write 같지 않지만 사실 Write" 패턴도 금지
await erpPrisma.erpInventory.upsert({ ... })             // ❌
```

---

## ERP → FactoryAI 단방향 동기화 패턴

ERP 데이터는 읽어서 **FactoryAI DB에 복사**(주 prisma 테이블에 저장). Write는 항상 주 prisma:

```ts
// app/api/v1/erp/sync/route.ts
'use server'

export async function syncErpInventory() {
  await requireRole(['ADMIN', 'OPERATOR'])

  // 1) ERP에서 읽기 (Read-Only)
  const erpItems = await erpPrisma.erpInventory.findMany({
    where: { updatedAt: { gte: lastSyncAt } },
  })

  // 2) FactoryAI DB에 쓰기 (주 prisma — Write 허용)
  for (const item of erpItems) {
    await prisma.inventorySnapshot.upsert({
      where: { erpId: item.id },
      create: { erpId: item.id, ...mapped(item) },
      update: { ...mapped(item), syncedAt: new Date() },
    })
  }

  // 3) 감사 로그
  await prisma.auditLog.create({
    data: {
      actor: 'system-erp-sync',
      action: 'ERP_SYNC',
      targetType: 'ErpInventory',
      targetId: 'batch',
      after: { count: erpItems.length },
    },
  })
}
```

---

## Mock ERP 사용 (MVP / ASM-02)

MVP에서는 별도 DB 사용자 권한 분리가 어려우므로 Layer 2 + Layer 3 코드 가드만으로 운영:

```ts
// lib/erp/mock.ts
const mockErpPrisma = new PrismaClient()  // 같은 DB

// 동일한 Middleware 적용 — 코드 가드만으로 차단
mockErpPrisma.$use(erpWriteBlockMiddleware)

// Mock 데이터는 seed.ts에서만 주입
```

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function seedMockErp() {
  // seed는 일반 prisma 클라이언트로 (Middleware 없는 인스턴스)
  await prisma.erpInventory.createMany({ data: [...] })  // Seed 시에만 허용
}
```

---

## CI 검증 (Phase 2)

```bash
# 어디서도 erpPrisma.*.create|update|delete 호출 0건
! grep -rnE "erpPrisma\.\w+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)" src/ app/ lib/

# seed.ts는 예외 (코멘트로 명시)
```

---

## 위반 시
- 런타임: `ERP_WRITE_FORBIDDEN` throw → Sentry 즉시 알림 → CIO에게 1분 내 통지 (SRS REQ-FUNC-022)
- 코드 리뷰: 발견 시 PR 거절, 작성자에게 본 Skill 링크
