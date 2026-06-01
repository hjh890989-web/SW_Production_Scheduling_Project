# 사내 생산 스케줄링 시스템 — PRD (Product Requirements Document)

| 항목 | 내용 |
|---|---|
| 문서명 | PRD — 통합 요구사항 명세서 |
| 문서 번호 | 15 |
| 버전 | v1.0 (Phase C 첫 발행) |
| 작성일 | 2026-05-10 |
| 작성 담당 | 경영기획 본부 |
| 문서 성격 | **AI 페어 코딩 직접 구현용 PRD** — 외주용 RFP 아님. Claude + 사용자가 본 문서를 직접 참조하여 코드 작성 |
| 입력 자료 | 개발계획서 #4 / 문제정의서 #6 / 페르소나 #8 / 여정맵 #9 / JTBD #10 / VPS #13 |
| 마스터 문서 참조 | `Phase_A/4_개발계획서_v1.3.md` (단일 기준 문서) |
| 다음 산출물 | #16 와이어프레임 (Phase C-2) |

---

# 0. 본 PRD의 사용 방법 (AI 페어 코딩 컨텍스트)

본 PRD는 **외주용 발주 문서가 아니라**, 사용자(경영기획)와 AI(Claude)가 **직접 코드를 작성하기 위한 단일 컨텍스트 문서**다.

## 0.1 사용 흐름
```
[1] 본 PRD를 컨텍스트로 로드
[2] Sprint 단위 작업 선택 (12장 Sprint 분할 참조)
[3] 해당 Sprint의 화면·API·DB·로직을 본 PRD에서 인용
[4] 코드 작성 → 실행 → 검증
[5] 결과를 PRD에 반영(필요 시 v1.1 갱신)
```

## 0.2 문서 작성 원칙
- **모호함 최소화** — 코드 생성 직전 수준의 구체성
- **결정 보류는 명시** — TBD/확인 필요는 명확히 표기
- **Sprint별 자기충족** — 한 Sprint 작업 시 다른 문서 의존 최소화

---

# 1. 프로젝트 컨텍스트 (1페이지 요약)

## 1.1 정체성
- **사내 자동차부품 고무호스 제조사**의 생산 스케줄링 자동화 웹앱
- 1차 도입 = **'실리콘' 부품 47품번 한정**
- 사용자 20명 (생산관리·현장관리자·영업·경영진)

## 1.2 핵심 비즈니스 룰
- **R-1**: 성형 공정은 납품일 D-2까지 완료 (하드 제약)
- **R-2**: 압출 공정은 성형 투입 D-1까지 완료 (하드 제약)
- **R-3**: 모든 스케줄러는 **백워드 스케줄링** (납품일 → 역산)
- **R-5**: 수주 통합 우선순위 = **주간계획 ▶ KD/월예상 중 빠른 납기**

## 1.3 시스템 철학 (D10) — **자동배분 → 수동 보정**
- 모든 스케줄링은 ① 자동 초안 → ② 사람 검토·확정
- 자동 룰 위반 시 **차단 X, 경고만**
- 자동 vs 수동 시각 구분

## 1.4 채택 결정타 (J-MR-2 ⭐⭐)
- 박철수 반장(성형)이 거부 시 도입 실패
- → **수동 보정 권한 + 큰 글씨 UI**가 모든 화면에 필수

## 1.5 데이터 출처
| 출처 | 형태 | 갱신 |
|---|---|---|
| 영림원 ERP | 표준 API 또는 SELECT DB | 야간 1회 (마스터·BOM) |
| 자체 MES | API/DB 자체 정의 | 5분 폴링 또는 webhook (실적·라인상태) |
| 수주 엑셀 3종 | 사용자 업로드 | 주간계획=목요일, KD=수시, 월예상=전월 25일 |

---

# 2. 확정 기술 스택

## 2.1 핵심 라이브러리

```json
{
  "framework": "Next.js 14+ (App Router)",
  "ui": "Tailwind CSS + shadcn/ui",
  "orm": "Prisma 5+",
  "db_dev": "SQLite",
  "db_prod": "PostgreSQL 15+ (사내)",
  "auth": "Auth.js (NextAuth) v5",
  "validation": "Zod",
  "form": "React Hook Form",
  "table": "TanStack Table",
  "gantt": "검토 중 — Bryntum / DHTMLX / frappe-gantt 중 1",
  "excel_io": "exceljs + xlsx",
  "pdf": "react-pdf 또는 puppeteer",
  "state": "React Server Components + 서버상태(SWR/TanStack Query는 필요시)",
  "container": "Docker + docker-compose",
  "node_version": "20 LTS"
}
```

## 2.2 사용 금지 (D8·D19)
- ❌ Vercel (배포·KV·Edge Functions·Blob 등 일체)
- ❌ Supabase (Auth·DB 모두)
- ❌ 외부 LLM API (Gemini·OpenAI 등)
- ❌ 클라우드 호스팅 SaaS

## 2.3 P2 단계 추가
- Python FastAPI 마이크로서비스 (OR-Tools 솔버)
- 사내 Ollama (LLM, 검토)

---

# 3. 프로젝트 디렉토리 구조

```
sw_scheduler/                       (Next.js 프로젝트 루트)
├── app/                            (App Router)
│   ├── (auth)/                     (인증 그룹)
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/                (인증 후 그룹)
│   │   ├── layout.tsx              (사이드바·헤더·인증 가드)
│   │   ├── page.tsx                (W-1 통합 대시보드)
│   │   ├── orders/                 (수주 통합)
│   │   │   ├── page.tsx            (W-1 일부)
│   │   │   ├── upload/page.tsx     (W-2)
│   │   │   ├── change/page.tsx     (W-3 변동 입력)
│   │   │   └── audit/page.tsx      (W-8 변경 이력)
│   │   ├── master/                 (마스터)
│   │   │   ├── items/page.tsx
│   │   │   ├── equipment/page.tsx
│   │   │   ├── parameters/page.tsx
│   │   │   ├── calendar/page.tsx   (W-7)
│   │   │   └── mapping/page.tsx
│   │   ├── inventory/page.tsx      (W-9)
│   │   ├── molding/page.tsx        (W-4 성형 간트)
│   │   ├── extrusion/page.tsx      (W-5 압출 간트)
│   │   ├── results/                (실적)
│   │   │   ├── molding/page.tsx
│   │   │   └── extrusion/page.tsx
│   │   └── admin/users/page.tsx    (사용자·권한 관리)
│   ├── api/                        (Route Handlers — 외부 통합용)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── erp/sync/route.ts       (영림원 야간 동기화)
│   │   └── mes/                    (MES 연동)
│   │       ├── result/route.ts     (실적 수집)
│   │       └── instruction/route.ts (작업지시 송신)
│   └── layout.tsx                  (전역 레이아웃)
├── components/
│   ├── ui/                         (shadcn 자동 생성)
│   ├── gantt/                      (간트 래퍼 컴포넌트)
│   ├── orders/                     (수주 도메인)
│   ├── scheduler/                  (스케줄러 도메인)
│   ├── master/
│   └── shared/                     (공통)
├── lib/
│   ├── auth.ts                     (Auth.js 설정)
│   ├── db.ts                       (Prisma 클라이언트)
│   ├── permissions.ts              (RBAC 매트릭스)
│   ├── audit.ts                    (Audit 로그 헬퍼)
│   ├── scheduler/                  (비즈니스 로직)
│   │   ├── molding-scheduler.ts
│   │   ├── extrusion-scheduler.ts
│   │   ├── impact-simulator.ts
│   │   └── backward-utils.ts
│   ├── etl/                        (엑셀 ETL)
│   │   ├── weekly-plan-parser.ts
│   │   ├── kd-order-parser.ts
│   │   ├── monthly-forecast-parser.ts
│   │   └── normalizer.ts
│   ├── erp/                        (영림원 클라이언트)
│   ├── mes/                        (MES 클라이언트)
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── server-actions/                 (Server Actions 모음)
│   ├── orders.ts
│   ├── master.ts
│   ├── scheduler.ts
│   └── inventory.ts
├── types/                          (TypeScript 타입 정의)
├── tests/                          (단위·통합 테스트)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example                    (실제 .env는 .gitignore)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

# 4. Prisma 데이터 모델 (전체 스키마)

본 섹션은 그대로 `prisma/schema.prisma`로 옮길 수 있도록 작성. 단, **타입 일부는 SQLite 호환을 위해 조정 필요** (PostgreSQL 시 강화).

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // dev. prod에서는 "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// 0. 사용자·권한 (Auth.js v5 호환)
// ============================================================

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  email         String?   @unique
  passwordHash  String
  name          String
  role          UserRole
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  auditLogs     AuditLog[]
  sessions      Session[]
}

enum UserRole {
  ADMIN
  PRODUCTION_MANAGER  // 생산관리
  MOLDING_LEADER      // 성형 반장
  EXTRUSION_LEADER    // 압출 반장
  SALES_PURCHASE      // 영업·구매
  EXECUTIVE           // 경영진
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])
}

// ============================================================
// 1. 마스터 데이터 (M-1 ~ M-4)
// ============================================================

// M-1. 품번 마스터 (호스↔제품 1:1 매칭)
model Item {
  id              String   @id @default(cuid())
  productCode     String   @unique               // 생산 품번 (PK)
  customerCode    String?                        // 고객사 품번
  hwasungCode     String?                        // 화승 ERP 코드
  material        String   @default("silicone")  // 재료
  category        String?                        // 제품군
  customer        String?                        // 고객사
  isKd            Boolean  @default(false)

  // 사양
  nominalDiameter Float?                         // 호칭경
  innerDiameter   Float?                         // 내경
  thickness       Float?                         // 두께

  // 압출
  extrusionSpeed  Float?                         // 압출속도 m/min
  extrusionGroup  Int?                           // E열 압출셋팅 1~8
  headPin         String?                        // 헤드/핀 (예: "22*8")
  cuttingLength   Float?                         // 재단길이 mm
  composite       Int?                           // 합금형 1/2/3/6
  extruderFord    Boolean  @default(false)
  extruderNew     Boolean  @default(false)

  // 성형 — 저압가류
  lpMoldsPerAngle Int?                           // 앵글당 금형수
  lpAngleCount    Int?                           // 앵글 보유수
  lpPosTop        Boolean  @default(false)       // 상단
  lpPosUpperMid   Boolean  @default(false)       // 중상단
  lpPosLowerMid   Boolean  @default(false)       // 중하단
  lpPosBottom     Boolean  @default(false)       // 하단

  // 성형 — IC가류
  icMoldsPerAngle Int?
  icAngleCount    Int?
  icPosTop        Boolean  @default(false)
  icPosMid        Boolean  @default(false)
  icPosBottom     Boolean  @default(false)

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  orders          Order[]
  inventories     Inventory[]
  moldingSchedules   MoldingSchedule[]
  extrusionSchedules ExtrusionSchedule[]
  productionResults  ProductionResult[]
  itemAliases     ItemAlias[]
}

// 품번 별칭 (정규화·동의어)
model ItemAlias {
  id        String @id @default(cuid())
  itemId    String
  alias     String @unique  // 다른 표기 (예: "25474-2S000/2S010")
  source    String?         // 어디서 쓰는 표기인지 (예: "OEM-현대")

  item      Item   @relation(fields: [itemId], references: [id])
}

// M-2. 장비 마스터
model Equipment {
  id          String         @id @default(cuid())
  type        EquipmentType
  name        String         // "저압가류기 1호기" / "포드 압출기" 등
  capacity    Json?          // 슬롯 정의 (위치별 개수 등)
  isActive    Boolean        @default(true)

  schedules   EquipmentSchedule[]
}

enum EquipmentType {
  MOLDING_LP   // 저압가류기
  MOLDING_IC   // IC가류기
  EXTRUSION    // 압출기 (포드/신규)
}

// M-3. 운영 파라미터 (key-value)
model OperationParam {
  key         String   @id   // 예: "lp_rotation_day", "extrusion_efficiency"
  value       String         // JSON 또는 숫자 문자열
  description String?
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}

// 초기값 (seed):
// lp_rotation_day = 8, lp_rotation_night = 10
// ic_rotation_day = 8, ic_rotation_night = 10
// rotation_minutes = 45
// extrusion_shift_day_first = 4, day_second = 4, night_first = 4.5, night_second = 5
// extrusion_efficiency = 0.75
// angle_change_loss_rotations = 1
// d2_rule_days = 2, d1_rule_days = 1

// M-4. 캘린더
model CalendarDay {
  date        DateTime @id              // 일자 (UTC midnight)
  isWorkday   Boolean  @default(true)
  type        DayType  @default(NORMAL)
  note        String?

  updatedAt   DateTime @updatedAt
  updatedBy   String?
}

enum DayType {
  NORMAL
  HOLIDAY
  PM        // 정기 점검
  TEMP_OFF  // 임시 휴무
}

// ============================================================
// 2. 트랜잭션 데이터 (T-1 ~ T-6)
// ============================================================

// T-1. 수주 통합
model Order {
  id              String       @id @default(cuid())
  itemId          String
  deliveryDate    DateTime
  quantity        Int

  orderType       OrderType                      // OEM / KD
  sourceType      OrderSourceType                // weekly_plan / kd / monthly_forecast
  confidence      Confidence  @default(CONFIRMED)  // confirmed / forecast / mixed

  customer        String?
  carModel        String?                        // 차종
  spec            String?                        // 사양
  postProcess     String?                        // 후가공 (우영/미진)

  // 출처 추적
  sourceFile      String?
  sourceSheet     String?
  sourceRow       Int?
  orderNumber     String?                        // KD: 발주번호
  poNumber        String?                        // KD: 오더번호

  status          OrderStatus  @default(ACTIVE)
  createdAt       DateTime     @default(now())
  createdBy       String
  updatedAt       DateTime     @updatedAt

  item            Item         @relation(fields: [itemId], references: [id])

  @@index([itemId, deliveryDate])
  @@index([sourceType])
}

enum OrderType {
  OEM
  KD
}

enum OrderSourceType {
  WEEKLY_PLAN
  KD
  MONTHLY_FORECAST
  MANUAL    // 사용자 직접 입력
}

enum Confidence {
  CONFIRMED
  FORECAST
  MIXED
}

enum OrderStatus {
  ACTIVE
  CHANGED
  CANCELLED
}

// T-2. 재고 (일자별 시계열)
model Inventory {
  id          String   @id @default(cuid())
  itemId      String
  date        DateTime
  quantity    Int

  source      InventorySource         // INITIAL / PRODUCTION / DELIVERY / MANUAL

  createdAt   DateTime @default(now())
  createdBy   String?

  item        Item     @relation(fields: [itemId], references: [id])

  @@unique([itemId, date])
}

enum InventorySource {
  INITIAL
  PRODUCTION
  DELIVERY
  MANUAL
}

// T-3. 목표재고
model TargetInventory {
  itemId      String   @id
  quantity    Int
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  item        Item     @relation(fields: [itemId], references: [id])
}

// T-4. 생산실적 (MES 연동)
model ProductionResult {
  id          String       @id @default(cuid())
  itemId      String
  process     ProcessType                      // MOLDING / EXTRUSION
  date        DateTime
  shift       ShiftType?
  quantity    Int
  source      String       @default("MES")    // 출처 (MES / MANUAL)
  externalId  String?                          // MES 측 ID

  createdAt   DateTime     @default(now())

  item        Item         @relation(fields: [itemId], references: [id])

  @@index([itemId, date])
}

enum ProcessType {
  MOLDING
  EXTRUSION
}

enum ShiftType {
  DAY_FIRST   // 주간 전반
  DAY_SECOND  // 주간 후반
  NIGHT_FIRST // 야간 전반
  NIGHT_SECOND// 야간 후반
}

// T-5. 납품실적 (P1 — MVP-1에는 placeholder)
model DeliveryResult {
  id           String   @id @default(cuid())
  itemId       String
  date         DateTime
  quantity     Int
  externalId   String?
  createdAt    DateTime @default(now())

  @@index([itemId, date])
}

// T-6. 변경 이력 (Audit Log)
model AuditLog {
  id          String       @id @default(cuid())
  userId      String
  userRole    UserRole
  action      AuditAction
  targetTable String                            // "Order" / "MoldingSchedule" 등
  targetKey   String                            // PK 값
  beforeJson  String?                           // 이전 값 JSON (string)
  afterJson   String?
  reason      String?
  ipAddress   String?
  sessionId   String?
  createdAt   DateTime     @default(now())

  user        User         @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([targetTable, targetKey])
  @@index([createdAt])
}

enum AuditAction {
  INSERT
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  EXPORT
}

// ============================================================
// 3. 스케줄 데이터 (S-1 ~ S-2)
// ============================================================

// S-1. 압출 스케줄
model ExtrusionSchedule {
  id              String       @id @default(cuid())
  date            DateTime
  shift           ShiftType
  extruderId      String                        // Equipment.id (포드 또는 신규)
  itemId          String
  quantity        Int                           // 배정 생산량 (EA)
  status          ScheduleStatus @default(AUTO)

  generatedAt     DateTime     @default(now())
  confirmedAt     DateTime?
  confirmedBy     String?

  item            Item         @relation(fields: [itemId], references: [id])

  @@index([date, shift])
  @@index([itemId])
}

// S-2. 성형 스케줄
model MoldingSchedule {
  id              String       @id @default(cuid())
  date            DateTime
  daynight        DayNight                      // DAY / NIGHT
  equipmentId     String                        // Equipment.id (가류기)
  slotPosition    SlotPosition                  // 슬롯 위치
  itemId          String
  rotations       Int                           // 배정 회전수
  status          ScheduleStatus @default(AUTO)

  generatedAt     DateTime     @default(now())
  confirmedAt     DateTime?
  confirmedBy     String?

  item            Item         @relation(fields: [itemId], references: [id])

  @@index([date, daynight])
  @@index([itemId])
}

enum ScheduleStatus {
  AUTO        // 자동 초안
  MANUAL      // 수동 보정됨
  CONFIRMED   // 확정 (운영 반영)
  STARTED     // 시작됨
  COMPLETED   // 완료
}

enum DayNight {
  DAY
  NIGHT
}

enum SlotPosition {
  // 저압가류기
  LP_TOP_1
  LP_TOP_2
  LP_UPPER_MID_1
  LP_UPPER_MID_2
  LP_LOWER_MID_1
  LP_LOWER_MID_2
  LP_BOTTOM_1
  LP_BOTTOM_2
  // IC가류기
  IC_TOP_1
  IC_TOP_2
  IC_MID_1
  IC_MID_2
  IC_BOTTOM_1
  IC_BOTTOM_2
}

// ============================================================
// 4. 매핑 룰 (엑셀 양식 정의)
// ============================================================

model ExcelMappingRule {
  id              String   @id @default(cuid())
  sourceType      OrderSourceType
  sheetName       String?
  headerRow       Int                           // 1-based
  dataStartRow    Int
  columnMapping   Json                          // { "재료": "A", "생산품번": "I", ... }
  isActive        Boolean  @default(true)
  updatedAt       DateTime @updatedAt
  updatedBy       String?
}

// ============================================================
// 5. 알림·실시간 (Phase D-2 이후)
// ============================================================

model Notification {
  id          String   @id @default(cuid())
  userId      String?                           // null = broadcast
  type        String                            // "schedule_change" / "alert" 등
  title       String
  message     String
  link        String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId, isRead])
}
```

> ⚠️ **주의**: SQLite에서는 `Json` 타입을 String으로 저장. PostgreSQL 이전 시 `Json`으로 강화. enum도 SQLite에서는 String으로 컴파일됨.

---

# 5. 인증·권한 (RBAC)

## 5.1 Role 매트릭스

```typescript
// lib/permissions.ts
export type Permission =
  | 'master:read' | 'master:write'
  | 'order:read' | 'order:write' | 'order:upload'
  | 'inventory:read' | 'inventory:write'
  | 'molding:read' | 'molding:write' | 'molding:confirm' | 'molding:result'
  | 'extrusion:read' | 'extrusion:write' | 'extrusion:confirm' | 'extrusion:result'
  | 'audit:read'
  | 'admin:user' | 'admin:system';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ['*'],  // 전체
  PRODUCTION_MANAGER: [
    'master:read', 'master:write',
    'order:read', 'order:write', 'order:upload',
    'inventory:read', 'inventory:write',
    'molding:read', 'molding:write', 'molding:confirm',
    'extrusion:read', 'extrusion:write', 'extrusion:confirm',
    'audit:read'
  ],
  MOLDING_LEADER: [
    'master:read',
    'molding:read', 'molding:write', 'molding:result',
    'extrusion:read'  // 자재공급 정보만
  ],
  EXTRUSION_LEADER: [
    'master:read',
    'molding:read',  // 자재요청 정보만
    'extrusion:read', 'extrusion:write', 'extrusion:result'
  ],
  SALES_PURCHASE: [
    'master:read',
    'order:read', 'order:write', 'order:upload'
  ],
  EXECUTIVE: [
    'master:read',
    'order:read',
    'inventory:read',
    'molding:read', 'extrusion:read',
    'audit:read'
  ]
};
```

## 5.2 미들웨어·가드

```typescript
// middleware.ts (App Router)
// - /login 외 모든 경로 인증 필수
// - 페이지·API별 Permission 체크
// - 위반 시 403

// (auth)/login → public
// (dashboard)/* → 인증 필수
// /api/* → 인증 + 적절 Permission
```

## 5.3 비밀번호 정책 (1차 자체 ID/PW)
- bcrypt 해시 (rounds 12)
- 8자 이상, 영문+숫자+특수문자
- 90일 변경 (사내 표준)
- 5회 실패 시 5분 잠금
- 세션 8시간 idle timeout

## 5.4 모든 변경 = Audit (R-13)

```typescript
// lib/audit.ts
async function logAudit(params: {
  userId: string;
  action: AuditAction;
  targetTable: string;
  targetKey: string;
  before?: any;
  after?: any;
  reason?: string;
}) { /* AuditLog.create() */ }
```

---

# 6. 페이지·화면 (W-1 ~ W-9)

핵심 화면 9종. 각 화면의 **목적·페르소나·주요 컴포넌트·인터랙션·데이터 의존**을 명세.

## W-1. 통합 대시보드 (`/`)
- **페르소나**: 김민수(주), 모두 (필터 권한 따름)
- **목적**: 변동 알림·진행률·이번 주 요약 한 화면
- **컴포넌트**:
  - 변동 알림 카드 (최근 미확인 건)
  - 이번 주 수주 카드 (주차별·고객사별 합계)
  - KSF 6지표 미니 대시보드 (현재값)
  - 진행 중 스케줄 진행률 (성형·압출)
- **인터랙션**: 알림 카드 → 변동 입력 화면(W-3) 이동
- **API**: `/server-actions/dashboard/getOverview`

## W-2. 수주 업로드 (`/orders/upload`)
- **페르소나**: 정수진(주), 김민수
- **목적**: 엑셀 3종 업로드 + 자동 매핑·검증
- **컴포넌트**:
  - 파일 드롭존 (`react-dropzone`)
  - 파일별 매핑 룰 미리보기
  - 검증 결과 (매칭 미실패 품번 표시)
  - 업로드 확정 버튼
- **인터랙션**: 업로드 → 미리보기 → 사용자 검토 → 확정 → DB 적재
- **Server Action**: `uploadOrderFile(file, sourceType)`

## W-3. 변동 입력 (`/orders/change`)
- **페르소나**: 정수진(주), 김민수
- **목적**: 메일·전화·카톡으로 받은 변동을 즉시 입력 + 영향 시뮬
- **컴포넌트**:
  - 폼: 품번·납품일·수량·변경유형(추가/수정/취소)
  - 즉시 영향 시뮬 결과 패널 (J-PM-1 ⭐)
  - 영향받는 진행중 건 표시 (🔴/🟡/🟢)
- **인터랙션**: 폼 입력 → 시뮬 자동 실행 → 검토 → 확정
- **Server Action**: `submitOrderChange(input)` + `simulateImpact(input)`

## W-4. 성형 간트 (`/molding`)
- **페르소나**: 김민수, 박철수(주)
- **목적**: 성형 스케줄 자동 + 수동 조정 (J-MR-2 ⭐⭐ 결정타)
- **컴포넌트**:
  - 간트차트 (행=가류기×슬롯, 열=일자·주야)
  - 색상 = 품번
  - 드래그·재배분
  - 자동 vs 수동 시각 구분
  - 룰 위반 시 경고 토스트 (차단 X)
- **인터랙션**:
  - "자동 생성" 버튼 → 룰베이스 알고리즘 → 초안 표시
  - 슬롯 드래그 → 위치/일자 변경 → audit 자동 기록
  - "확정" 버튼 → status: AUTO → CONFIRMED
- **Server Action**: `generateMoldingSchedule()` / `updateMoldingSlot()` / `confirmMoldingSchedule()`

## W-5. 압출 간트 (`/extrusion`)
- **페르소나**: 김민수, 이영호(주)
- **목적**: 압출 스케줄 자동 + 수동
- **컴포넌트**:
  - 간트차트 (행=라인×근무, 열=일자)
  - 색상 = E그룹 (J-ER-3 부하 분산 시각화)
  - 다이/노즐 변경 횟수 카운터 표시
- **Server Action**: `generateExtrusionSchedule()` / `updateExtrusionSlot()`

## W-6. 마스터 관리 (`/master/*`)
- **페르소나**: Admin, 김민수(파라미터·캘린더 일부)
- **목적**: 모든 제약조건 GUI 수정 (R-9)
- **하위 화면**:
  - `/master/items` — 품번 마스터
  - `/master/equipment` — 장비
  - `/master/parameters` — 운영 파라미터
  - `/master/mapping` — 엑셀 매핑 룰
- **컴포넌트**: TanStack Table + 인라인 편집 모달

## W-7. 캘린더 (`/master/calendar`)
- **페르소나**: 김민수
- **목적**: 영업일·공휴일·PM·임시휴무 토글
- **컴포넌트**: 월간 캘린더 + 일자 클릭 시 모달 (DayType 변경)

## W-8. 변경 이력 (`/orders/audit` + `/admin/audit`)
- **페르소나**: 모두 (본인 분), 경영진·Admin (전체)
- **목적**: Audit 로그 시계열 조회
- **컴포넌트**: 타임라인 + 필터 (사용자·일자·테이블)

## W-9. 재고 관리 (`/inventory`)
- **페르소나**: 김민수
- **목적**: 품번별 현재고·목표재고 + 추이
- **컴포넌트**: 표 + 수정 모달 + 추이 그래프 (Recharts)

---

# 7. Server Actions / API (핵심)

## 7.1 Server Actions (Next.js App Router)

```typescript
// server-actions/orders.ts

// 엑셀 업로드 + 파싱 + DB 적재
export async function uploadOrderFile(
  formData: FormData,
  sourceType: OrderSourceType
): Promise<UploadResult>;

// 변동 입력 + 영향 시뮬
export async function submitOrderChange(
  input: OrderChangeInput
): Promise<{ orderId: string; impact: ImpactResult }>;

// 영향만 시뮬 (확정 전)
export async function simulateOrderChange(
  input: OrderChangeInput
): Promise<ImpactResult>;
```

```typescript
// server-actions/scheduler.ts

export async function generateMoldingSchedule(
  weekStart: Date
): Promise<MoldingScheduleDraft>;

export async function generateExtrusionSchedule(
  weekStart: Date,
  moldingDraft: MoldingScheduleDraft
): Promise<ExtrusionScheduleDraft>;

export async function updateMoldingSlot(
  scheduleId: string,
  changes: { equipmentId?, slotPosition?, date?, daynight?, rotations? }
): Promise<MoldingSchedule>;

export async function confirmSchedule(
  type: ProcessType,
  weekStart: Date
): Promise<void>;
```

## 7.2 Route Handlers (외부 통합)

```typescript
// app/api/erp/sync/route.ts
// 야간 cron으로 호출
// 영림원에서 품번·BOM·거래처 동기화

// app/api/mes/result/route.ts (POST)
// MES → 우리 (작업실적)

// app/api/mes/instruction/route.ts (POST)
// 우리 → MES (작업지시)
```

---

# 8. 핵심 비즈니스 로직 (의사코드)

본 절은 개발계획서 부록 B 의사코드를 **TypeScript에 가깝게** 구체화.

## 8.1 성형 백워드 스케줄러

```typescript
// lib/scheduler/molding-scheduler.ts

interface MoldingSchedulerInput {
  orders: Order[];
  inventory: Map<itemId, number>;
  targetInventory: Map<itemId, number>;
  calendar: CalendarDay[];
  params: OperationParams;
}

interface MoldingSchedulerOutput {
  schedules: MoldingSchedule[];
  pipeRequests: PipeRequest[];  // → 압출 입력
  warnings: Warning[];
}

async function generateMoldingSchedule(input): MoldingSchedulerOutput {
  const sortedOrders = sortBy(input.orders, 'deliveryDate');
  const result: MoldingSchedule[] = [];
  const warnings: Warning[] = [];

  for (const order of sortedOrders) {
    const item = await prisma.item.findUnique({ where: { productCode: order.productCode } });
    const currentInv = input.inventory.get(item.id) ?? 0;
    const targetInv = input.targetInventory.get(item.id) ?? 0;
    const required = order.quantity + targetInv - currentInv;

    // 회전당 산출량 계산
    const machineType = decideMachine(item);  // 저압 또는 IC
    const moldsPerAngle = machineType === 'LP' ? item.lpMoldsPerAngle : item.icMoldsPerAngle;
    const composite = item.composite ?? 1;
    const slotsAssigned = 1;  // 초기. 향후 다중 슬롯 가능
    const perRotation = moldsPerAngle * composite * slotsAssigned;
    const requiredRotations = Math.ceil(required / perRotation);

    // 슬롯 선택 (위치 가능 O 우선)
    const eligibleSlots = findEligibleSlots(item, machineType);
    if (eligibleSlots.length === 0) {
      warnings.push({ type: 'NO_SLOT', orderId: order.id });
      continue;
    }

    // 백워드 채움 (deadline = 납품일 - 2일)
    let remaining = requiredRotations;
    const deadline = subDays(order.deliveryDate, 2);
    let cursor = deadline;

    while (remaining > 0 && cursor >= today()) {
      if (!isWorkday(cursor, input.calendar)) {
        cursor = subDays(cursor, 1);
        continue;
      }

      // 주야간 회전수 가용량
      const dayCapacity = getRemainingCapacity(cursor, 'DAY', machineType, result);
      const nightCapacity = getRemainingCapacity(cursor, 'NIGHT', machineType, result);
      const available = Math.min(remaining, dayCapacity + nightCapacity);

      if (available > 0) {
        // 우선 야간 (회전수 더 많음) → 그 다음 주간
        const nightAssign = Math.min(remaining, nightCapacity);
        const dayAssign = Math.min(remaining - nightAssign, dayCapacity);

        if (nightAssign > 0) {
          result.push({
            date: cursor, daynight: 'NIGHT',
            equipmentId: pickEquipment(machineType, eligibleSlots),
            slotPosition: pickSlot(eligibleSlots, item),
            itemId: item.id, rotations: nightAssign,
            status: 'AUTO'
          });
          remaining -= nightAssign;
        }
        if (dayAssign > 0) {
          result.push({
            date: cursor, daynight: 'DAY',
            equipmentId: pickEquipment(machineType, eligibleSlots),
            slotPosition: pickSlot(eligibleSlots, item),
            itemId: item.id, rotations: dayAssign,
            status: 'AUTO'
          });
          remaining -= dayAssign;
        }
      }
      cursor = subDays(cursor, 1);
    }

    if (remaining > 0) {
      warnings.push({
        type: 'D2_VIOLATION',
        orderId: order.id,
        unfulfilled: remaining
      });
    }
  }

  // 관체 요청서 생성
  const pipeRequests = result.map(s => ({
    itemId: s.itemId,
    quantity: s.rotations * perRotationFor(s),
    deliveryDate: subDays(s.date, 1)  // 성형 투입 전날
  }));

  return { schedules: result, pipeRequests, warnings };
}
```

## 8.2 압출 백워드 스케줄러

```typescript
// lib/scheduler/extrusion-scheduler.ts

async function generateExtrusionSchedule(
  pipeRequests: PipeRequest[],
  params
): ExtrusionSchedulerOutput {
  // 1) (E그룹, 헤드핀)으로 묶기
  const grouped = groupBy(pipeRequests, p => `${p.extrusionGroup}_${p.headPin}`);

  // 2) 그룹 내 deadline 정렬
  for (const [key, requests] of grouped) {
    requests.sort((a, b) => a.deliveryDate - b.deliveryDate);
  }

  const result: ExtrusionSchedule[] = [];
  const warnings: Warning[] = [];

  for (const [key, requests] of grouped) {
    for (const req of requests) {
      let remaining = req.quantity;
      const deadline = req.deliveryDate;
      const item = await getItem(req.itemId);

      // 라인 선택 (신규 우선)
      const line = item.extruderNew ? 'NEW' : (item.extruderFord ? 'FORD' : null);
      if (!line) { warnings.push({ ... }); continue; }

      // 백워드 채움
      let cursor = deadline;
      while (remaining > 0 && cursor >= today()) {
        if (!isWorkday(cursor, calendar)) { cursor = subDays(cursor, 1); continue; }

        for (const shift of ['NIGHT_SECOND', 'NIGHT_FIRST', 'DAY_SECOND', 'DAY_FIRST']) {
          const shiftHours = getShiftHours(shift);
          const efficiency = 0.75;
          const capacity = (shiftHours * efficiency * item.extrusionSpeed * 60) / item.cuttingLength;
          const remainingCapacity = capacity - usedCapacity(cursor, shift, line, result);
          if (remainingCapacity <= 0) continue;

          const assign = Math.min(remaining, Math.floor(remainingCapacity));
          if (assign > 0) {
            result.push({
              date: cursor, shift,
              extruderId: getEquipmentId(line),
              itemId: item.id, quantity: assign,
              status: 'AUTO'
            });
            remaining -= assign;
            if (remaining <= 0) break;
          }
        }
        cursor = subDays(cursor, 1);
      }

      if (remaining > 0) {
        warnings.push({ type: 'D1_VIOLATION', requestId: req.id, unfulfilled: remaining });
      }
    }
  }

  // 부하 균형 후처리 (신규 과부하 시 포드로 일부 이동, 호환 가능 시)
  rebalance(result);

  return { schedules: result, warnings };
}
```

## 8.3 영향 시뮬레이션 (R-8)

```typescript
// lib/scheduler/impact-simulator.ts

async function simulateImpact(
  changes: OrderChange[]
): Promise<ImpactResult> {
  // 1) 영향받는 기존 스케줄 식별
  const affected = await findAffectedSchedules(changes);

  // 2) 상태별 분류
  const result = affected.map(s => ({
    schedule: s,
    severity:
      s.status === 'STARTED' || s.status === 'COMPLETED' ? 'RED'
      : s.status === 'CONFIRMED' ? 'YELLOW'
      : 'GREEN'
  }));

  // 3) 재계산 (시뮬용 — 실제 DB 변경 X)
  const newPlan = await dryRunReschedule(changes);

  return { affected: result, newPlan, summary: { red, yellow, green } };
}
```

---

# 9. UI 컴포넌트 사양 (shadcn/ui 매핑)

## 9.1 shadcn 사용 컴포넌트

| 화면 영역 | shadcn 컴포넌트 |
|---|---|
| 사이드바 | `Sheet` + custom |
| 헤더 | `DropdownMenu` (사용자) |
| 폼 | `Form` + `Input` + `Select` + `Textarea` + Zod 검증 |
| 테이블 | `DataTable` (TanStack Table 기반) |
| 모달 | `Dialog` |
| 알림 | `Toast` (Sonner) |
| 카드 | `Card` |
| 탭 | `Tabs` |
| 버튼 | `Button` (variants: default, destructive, outline, secondary) |
| 캘린더 | `Calendar` (date-picker) |
| 차트 | `Chart` (Recharts wrapper) |
| 스켈레톤 | `Skeleton` |

## 9.2 별도 도입 컴포넌트
- **간트차트**: Bryntum / DHTMLX / frappe-gantt 중 1 (Sprint 1에서 결정)
- **드롭존**: `react-dropzone`
- **엑셀 미리보기**: 자체 구현 (table + 매핑 표시)

## 9.3 베테랑 친화 UX 원칙 (J-MR-2 ⭐⭐ 대응)
- **글씨 16px 이상** (현장 태블릿)
- **버튼 크기 44×44px 이상** (터치 타겟)
- **자동 결과 = 회색 배경, 사람 확정 = 파란 테두리** 시각 구분
- **룰 위반 = 빨간 경고 토스트, 차단 X**
- **"왜 이 결과?" 툴팁** (간트 셀 hover 시 근거 표시)

---

# 10. 비기능 요구사항

## 10.1 성능
- 통합 대시보드 첫 로드 ≤ 1.5초 (사내망)
- 변동 영향 시뮬 ≤ 5초 (J-PM-1 KSF-3 목표)
- 자동 스케줄 생성 ≤ 5초 (47품번 기준, J-MR-3)

## 10.2 가용성
- 1차: 사내 단일서버, 가용성 99% (월 7시간 다운 허용)
- 백업: 일일 → NAS

## 10.3 보안
- HTTPS (사내 인증서)
- IP 화이트리스트
- bcrypt 비밀번호
- SQL Injection 방지 (Prisma)
- CSRF (Next.js 기본)

## 10.4 컴플라이언스
- Audit 로그 5년 보존 (자동차부품 OEM 추적성)

## 10.5 Cloud-Ready (D20)
- 모든 설정 환경변수
- Docker 컨테이너화
- 무상태 앱
- 객체 스토리지 추상화 (`IObjectStorage`)
- 인증 추상화 (Auth.js adapter pattern)

---

# 11. 데이터 흐름

```
[수주 엑셀 업로드]
       ↓
[ETL: 매핑·정규화·실리콘 필터링]
       ↓
[Order 테이블 적재] ← Audit
       ↓
[성형 스케줄러 (백워드)] ← Inventory, TargetInventory, OperationParam, Calendar
       ↓
[MoldingSchedule + 관체요청서]
       ↓
[압출 스케줄러 (백워드)]
       ↓
[ExtrusionSchedule]
       ↓
[사용자 수동 조정] ← Audit
       ↓
[확정] → MES 송신 (P1)
       ↓
[ProductionResult ← MES] → Inventory 자동 갱신
```

---

# 12. Sprint 분할 (단계별 코딩 작업)

본 시스템을 **순차 코딩 세션**으로 나눈 계획. 각 Sprint는 1~3 세션 정도.

## Sprint 0 — 프로젝트 셋업
- Next.js 14 App Router 프로젝트 생성
- Tailwind + shadcn/ui 설정 (`npx shadcn-ui@latest init`)
- Prisma + SQLite 초기화 (`prisma init`)
- Auth.js v5 기본 설정
- Docker + docker-compose 기본 파일
- `.env.example` 작성
- Git 초기화 + .gitignore

## Sprint 1 — 인증·사용자 (R-13, D18)
- `prisma/schema.prisma`에 User, Session, AuditLog 추가
- `lib/auth.ts` Auth.js Credentials Provider 설정
- `app/(auth)/login/page.tsx` 로그인 화면
- `middleware.ts` 인증 가드
- `lib/permissions.ts` RBAC 매트릭스
- Admin 사용자 시드
- 로그인/로그아웃 audit 로그

## Sprint 2 — 마스터 데이터 (M-1 ~ M-4)
- 전체 Prisma 스키마 적용 (`prisma migrate dev`)
- 시드 데이터: 47개 실리콘 품번 + 장비 + 운영 파라미터 초기값 + 캘린더
- W-6 마스터 관리 화면 (CRUD + 인라인 편집)
- W-7 캘린더 화면 (월간 + 토글)
- 모든 변경에 Audit

## Sprint 3 — 수주 통합 (R-7 확장)
- ETL 파서 (lib/etl/) — 3종 양식
- ItemAlias 정규화
- 자동 실리콘 필터링 로직
- W-2 수주 업로드 화면
- W-3 변동 직접 입력 화면 (시뮬 없이 폼만)
- 우선순위 룰 적용 (R-5)

## Sprint 4 — 통합 대시보드 + Audit
- W-1 통합 대시보드
- W-8 변경 이력 화면
- KSF 미니 위젯 (placeholder, 실 데이터는 추후)

## Sprint 5 — 성형 스케줄러 (J-MR-2 ⭐⭐)
- 간트 라이브러리 결정·도입
- `lib/scheduler/molding-scheduler.ts` 룰베이스 알고리즘
- W-4 성형 간트 화면
- 자동 생성 + 드래그 수동 조정 + 확정
- **J-MR-2 핵심**: 자동 vs 수동 시각 구분, 룰 위반 경고만

## Sprint 6 — 압출 스케줄러
- `lib/scheduler/extrusion-scheduler.ts` 룰베이스
- 관체 요청서 자동 생성 → 입력 연결
- W-5 압출 간트 화면
- E그룹·헤드핀 묶음 + 신규 우선 부하 분산

## Sprint 7 — 영향 시뮬레이션 (R-8, J-PM-1)
- `lib/scheduler/impact-simulator.ts`
- W-3 변동 입력에 시뮬 결과 패널 통합
- W-4·W-5에 영향받는 건 표시

## Sprint 8 — 출력 (F-6)
- 엑셀 export (시트별 일자 + 요약)
- 작업지시서 PDF 출력

## Sprint 9 — MES 연동 (P1)
- `lib/mes/` 클라이언트 (인터페이스 추상화)
- `app/api/mes/result/route.ts` 실적 수집
- `app/api/mes/instruction/route.ts` 작업지시 송신
- 실적 자동 갱신 → 재고 반영

## Sprint 10 — 영림원 ERP 연동 (P1)
- `lib/erp/` 클라이언트
- `app/api/erp/sync/route.ts` 야간 동기화
- 품번 마스터 자동 갱신

## Sprint 11 — 통합 테스트·배포
- E2E 테스트 (Playwright)
- 단위 테스트 (Vitest)
- 사내 서버 배포 (Docker)
- 백업 스크립트
- 운영 문서

## Sprint 12+ — P2 단계
- Python OR-Tools 마이크로서비스
- AD/LDAP SSO 검토
- 모바일 KSF 대시보드 (J-EX-1)
- 타 재료군 확대 (EPDM·NBR)

---

# 13. 결정 보류·확인 필요 (TBD)

| # | 항목 | 결정 시점 |
|---|---|---|
| TBD-1 | 간트 라이브러리 (Bryntum/DHTMLX/frappe-gantt) | Sprint 1 시작 전 — 라이선스·기능 비교 후 결정 |
| TBD-2 | 영림원 표준 API 사양 (외부 요청 필요) | Sprint 10 전 |
| TBD-3 | 자체 MES API 사양 (담당 부서 협의) | Sprint 9 전 |
| TBD-4 | 단가(라인 가동비·인건비·OEM 페널티) | ROI 정밀화 시 |
| TBD-5 | 박철수·이영호 반장 인터뷰 결과 → UX 보정 | Sprint 5 전 (B-3 인터뷰 후) |
| TBD-6 | 외부 벤치마크 (자동차부품 OEM 납기 표준) | VPS Proof-5 보강 시 |

---

# 14. 변경 이력

| 버전 | 일자 | 내용 | 작성자 |
|---|---|---|---|
| v1.0 | 2026-05-10 | Phase C 첫 발행. AI 페어 코딩용 통합 PRD: 데이터 모델·페이지·Server Action·비즈니스 로직 의사코드·Sprint 분할 12단계. 외주용 RFP 아닌 직접 구현용. | 경영기획 본부 |

---

**[문서 끝 — PRD v1.0]**
