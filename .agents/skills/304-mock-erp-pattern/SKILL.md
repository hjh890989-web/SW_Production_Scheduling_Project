---
name: 304-mock-erp-pattern
description: MVP에서 ERP 데이터 시드·조회 코드 작성 시 자동 발동. ASM-02 — 실제 ERP 연동 대신 Supabase 내 Mock ERP 테이블(더존 iCUBE 스키마 모방) 사용 패턴 안내.
---

# Mock ERP Pattern (MVP / ASM-02)

> **자동 발동 트리거**: ERP 관련 신규 모델·시드 데이터·API 작성 시.

## 맥락 (SRS ASM-02 / CON-05)

- MVP는 **1인 개발 + 무료 인프라** 제약 하에 실제 더존 iCUBE / 영림원 K-System 연동 불가.
- 대신 **Supabase 내 Mock ERP 테이블**에 더존 iCUBE 스키마를 모방하여 시연.
- 실제 ERP 연동 (Cloudflare Tunnel + Read-Only)은 **Phase 2 (PROD)**로 이연.
- **Mock ↔ 실제 ERP 스키마 호환성**을 유지해야 Phase 2 전환 비용 최소화.

---

## Prisma 스키마 (더존 iCUBE 모방)

```prisma
// prisma/schema.prisma — Mock ERP 섹션

/// 더존 iCUBE 재고 마스터 모방
model ErpInventory {
  id            String   @id @default(cuid())
  itemCode      String   @unique  // 더존 품목코드
  itemName      String                       // 품목명
  spec          String?                      // 규격
  unit          String                       // 단위 (EA, KG 등)
  warehouseId   String                       // 창고
  quantity      Decimal  @db.Decimal(15, 4)  // 재고량
  safetyStock   Decimal? @db.Decimal(15, 4)  // 안전재고
  updatedAt     DateTime @default(now())     // ERP가 업데이트한 시점
  syncedAt      DateTime @default(now())     // FactoryAI가 동기화한 시점

  @@index([warehouseId, itemCode])
  @@map("erp_inventory")
}

/// 더존 iCUBE 수주 마스터 모방
model ErpOrder {
  id            String   @id @default(cuid())
  orderNo       String   @unique  // 더존 수주번호
  customerCode  String
  customerName  String
  orderDate     DateTime
  dueDate       DateTime
  totalAmount   Decimal  @db.Decimal(18, 2)
  status        String   // 'PENDING', 'CONFIRMED', 'SHIPPED', 'CLOSED'
  items         ErpOrderItem[]
  updatedAt     DateTime @default(now())
  syncedAt      DateTime @default(now())

  @@index([orderDate, customerCode])
  @@map("erp_orders")
}

model ErpOrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       ErpOrder @relation(fields: [orderId], references: [id])
  itemCode    String
  quantity    Decimal  @db.Decimal(15, 4)
  unitPrice   Decimal  @db.Decimal(18, 2)
  amount      Decimal  @db.Decimal(18, 2)

  @@index([orderId])
  @@map("erp_order_items")
}

/// 생산실적 (영림원 K-System 모방)
model ErpProductionResult {
  id            String   @id @default(cuid())
  lotCode       String   @unique
  itemCode      String
  productionDate DateTime
  goodQty       Decimal  @db.Decimal(15, 4)
  defectQty     Decimal  @db.Decimal(15, 4)
  workCenter    String
  updatedAt     DateTime @default(now())

  @@index([productionDate, workCenter])
  @@map("erp_production_results")
}
```

---

## Seed Data (`prisma/seed.ts`)

```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function seedMockErp() {
  // 금속가공 시나리오
  await prisma.erpInventory.createMany({
    data: [
      { itemCode: 'STL-001', itemName: 'SS400 강판 1.6T', unit: 'KG', warehouseId: 'WH-A', quantity: 1240.5, safetyStock: 500 },
      { itemCode: 'STL-002', itemName: 'SS400 강판 2.0T', unit: 'KG', warehouseId: 'WH-A', quantity: 850.0, safetyStock: 400 },
      { itemCode: 'WLD-100', itemName: '용접봉 E7018', unit: 'EA', warehouseId: 'WH-B', quantity: 320, safetyStock: 100 },
    ],
  })

  // 식품제조 시나리오
  await prisma.erpInventory.createMany({
    data: [
      { itemCode: 'ING-MILK-1L', itemName: '우유 1L', unit: 'EA', warehouseId: 'WH-COLD', quantity: 480, safetyStock: 200 },
      { itemCode: 'PKG-BOX-A', itemName: '포장 박스 A형', unit: 'EA', warehouseId: 'WH-PKG', quantity: 1500, safetyStock: 500 },
    ],
  })

  await prisma.erpOrder.create({
    data: {
      orderNo: 'PO-2026-0001',
      customerCode: 'C-001',
      customerName: '대원제조㈜',
      orderDate: new Date('2026-05-01'),
      dueDate: new Date('2026-05-30'),
      totalAmount: 12_500_000,
      status: 'CONFIRMED',
      items: {
        create: [
          { itemCode: 'STL-001', quantity: 500, unitPrice: 25_000, amount: 12_500_000 },
        ],
      },
    },
  })

  console.log('Mock ERP seeded.')
}

seedMockErp().finally(() => prisma.$disconnect())
```

`package.json`:
```json
{
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

실행:
```bash
npx prisma db seed
```

---

## 조회 헬퍼 (`lib/erp/queries.ts`)

```ts
import { prisma } from '@/lib/db'

// Mock ERP는 같은 DB이므로 일반 prisma 사용 (단, 직접 write는 Layer 2 미들웨어로 차단)
// 실제 ERP 연동(Phase 2) 시에는 erpPrisma 별도 인스턴스로 전환

export async function getInventoryByWarehouse(warehouseId: string) {
  return prisma.erpInventory.findMany({
    where: { warehouseId },
    orderBy: { itemCode: 'asc' },
  })
}

export async function getLowStockItems(threshold = 0.2) {
  return prisma.$queryRaw`
    SELECT * FROM erp_inventory
    WHERE quantity < safety_stock * ${threshold + 1}
    ORDER BY (quantity / NULLIF(safety_stock, 0)) ASC
    LIMIT 20
  `
}

export async function getRecentOrders(limit = 10) {
  return prisma.erpOrder.findMany({
    take: limit,
    orderBy: { orderDate: 'desc' },
    include: { items: true },
  })
}
```

---

## Phase 2 전환 가이드

PROD에서 실제 ERP 연동으로 전환할 때:

1. **새 Prisma datasource 추가** (`erpDb`) → 별도 클라이언트 생성.
2. **Mock 모델은 그대로** → 개발/테스트 환경에서 계속 활용.
3. **조회 헬퍼만 데이터소스 교체**:
   ```ts
   // lib/erp/queries.ts
   const erpClient = process.env.NODE_ENV === 'production'
     ? erpPrisma
     : prisma  // dev/mvp는 mock
   ```
4. **Layer 2 Middleware는 양쪽 모두 적용** (Read-Only 보장).
5. **301-erp-readonly-guard Skill 다시 검토**.

---

## 주의

- Mock 데이터 변경(write)은 **`seed.ts`에서만**. Server Action에서 `erpInventory.create()` 호출 금지 (Layer 2가 차단).
- Mock 데이터에 PII (실제 고객 이름) 포함 금지 — 가상 고객사명 사용 (예: "대원제조㈜").
- Mock ERP 테이블의 `updatedAt`은 ERP 측 갱신 시간을 모방. 시드 시 의도적으로 과거 시점으로 설정.

---

## Naming Convention

| 대상 | 규칙 | 예 |
|---|---|---|
| Prisma 모델 | `Erp` prefix + PascalCase 단수 | `ErpInventory`, `ErpOrder` |
| 테이블 | `erp_` prefix + snake_case 복수 | `erp_inventory`, `erp_orders` |
| 환경변수 | `ERP_` prefix | `ERP_READONLY_URL`, `MOCK_ERP_ENABLED` |
| API 경로 | `/api/v1/erp/*` | `/api/v1/erp/sync`, `/api/v1/erp/excel-import` |
