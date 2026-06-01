---
name: 318-prisma-transactions
description: 다중 테이블 변경의 원자성·일관성. `prisma.$transaction`, `tx.`, `isolationLevel` 키워드 작업 시 자동. Lot 병합·다중 테이블 동시 업데이트·정합성 보장.
---

# Prisma Transactions

> **자동 발동 트리거** (좁게): `prisma\.\$transaction`, `tx\.\w+\.(create|update|delete)`, `isolationLevel` 키워드 작업 시.

REQ-FUNC-009 (Lot 시간순 병합 ≥99% 정확도) 등 **원자성이 필요한 작업**에서 필수.

---

## 1. 두 가지 모드

### Mode A: 배치 트랜잭션 (`$transaction([...])`)
```ts
// 모든 쿼리가 동시에 시작, 결과 배열로 반환
const [a, b, c] = await prisma.$transaction([
  prisma.lot.create({ data: dataA }),
  prisma.auditLog.create({ data: dataB }),
  prisma.systemSetting.upsert({ where: { key: 'last_lot_id' }, update: { value: dataC }, create: { /* ... */ }}),
])
```

**장점**: 단순. 정해진 쿼리 N개를 atomic하게 실행.
**단점**: 쿼리 간 결과를 다음 쿼리에 사용 불가.

### Mode B: 인터랙티브 트랜잭션 (`$transaction(async (tx) => {...})`)
```ts
const result = await prisma.$transaction(async (tx) => {
  const merged = await tx.lot.create({ data: mergedData })
  await tx.lot.updateMany({
    where: { id: { in: sourceIds }},
    data: { mergedIntoId: merged.id },
  })
  await tx.auditLog.create({
    data: {
      actor: actor.user(userId),
      action: 'MERGE',
      targetType: 'Lot',
      targetId: merged.id,
      after: { mergedFrom: sourceIds },
    },
  })
  return merged
}, { isolationLevel: 'Serializable', timeout: 8000 })
```

**장점**: 동적 로직 가능, 조건부 분기.
**단점**: 트랜잭션이 길어지면 락 경합 ↑.

**MVP 권장**: 단순한 경우 Mode A, 분기·다단계 필요 시 Mode B.

---

## 2. Isolation Level

| Level | 의미 | 적용 |
|---|---|---|
| `ReadUncommitted` | 더티 리드 허용 | 절대 안 씀 |
| `ReadCommitted` | 기본값 (PostgreSQL) | 대부분 OK |
| `RepeatableRead` | 같은 트랜잭션 내 동일 read 결과 보장 | 보고서 생성 |
| `Serializable` | 완전 직렬화 | **Lot 병합, 재고 차감** 등 정합성 critical |

```ts
await prisma.$transaction(async (tx) => { /* ... */ }, {
  isolationLevel: 'Serializable',
  timeout: 8000,         // ms — Vercel 10s 한도 고려 (여유 2s)
  maxWait: 2000,         // 트랜잭션 시작 대기 시간 (default 2000)
})
```

> `Serializable` 사용 시 **직렬화 실패 (`P2034`)** 발생 가능 → 재시도 로직 필요 (아래 §5).

---

## 3. 트랜잭션 안에 들어갈 것 / 밖에 둘 것

### ✅ 트랜잭션 안 (원자성 필요)
- 관련된 모든 Prisma write
- `auditLog.create()` (감사 흔적도 atomic)
- 같은 도메인의 관련 read (lock 필요 시)

### ❌ 트랜잭션 밖 (롤백 불가 / 느림)
- 외부 API 호출 (Gemini, 이메일, webhook)
- 파일 I/O
- 긴 계산
- `revalidatePath` (캐시 무효화는 commit 이후)

```ts
'use server'
export async function approveAndPublish(id: string) {
  // 1. 트랜잭션: DB 변경 + audit
  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.aiSuggestion.update({ where: { id }, data: { status: 'APPROVED' }})
    await tx.auditLog.create({ data: { actor: actor.user(userId), action: 'APPROVE', targetType: 'AiSuggestion', targetId: id, after: s }})
    return s
  })

  // 2. 트랜잭션 후: 외부 효과 + 캐시 (실패해도 DB 일관성은 유지)
  try {
    await sendEmail(updated.summary)
  } catch (err) {
    // 보상 트랜잭션 필요 시 별도 처리
    console.error('이메일 발송 실패:', err)
    // 옵션 1: 사용자에게 알림, 재시도 큐에 추가
  }
  revalidatePath('/quality')
}
```

---

## 4. 보상 트랜잭션 패턴

외부 시스템 호출이 트랜잭션에 못 들어가는 경우, **saga 패턴**:

```ts
'use server'
export async function chargeAndCreateInvoice(amount: number) {
  // Phase 1: DB에 PENDING으로 생성
  const invoice = await prisma.invoice.create({ data: { amount, status: 'PENDING' }})

  try {
    // Phase 2: 외부 결제 API (트랜잭션 밖)
    const charge = await externalPaymentApi.charge({ amount, ref: invoice.id })

    // Phase 3: 결과 반영
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID', chargeId: charge.id }})
  } catch (err) {
    // 보상: PENDING → FAILED 표시 (롤백 대신)
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'FAILED', error: String(err) }})
    throw err
  }
}
```

---

## 5. 직렬화 실패 재시도 (`P2034`)

```ts
async function withSerializableRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      if (err?.code !== 'P2034' || i === maxAttempts - 1) throw err
      const backoff = 50 * 2 ** i + Math.random() * 50   // jitter
      await new Promise(r => setTimeout(r, backoff))
    }
  }
  throw new Error('unreachable')
}

// 사용
await withSerializableRetry(() =>
  prisma.$transaction(async (tx) => { /* ... */ }, { isolationLevel: 'Serializable' })
)
```

---

## 6. 데드락 회피

- **테이블 잠금 순서 일관**: 항상 같은 순서로 access (예: 모든 트랜잭션이 `Lot` → `AuditLog` 순서로 update)
- **트랜잭션 짧게**: 외부 호출/긴 계산은 밖으로
- **인덱스 점검**: row-level lock이 의도대로 잡히는지

---

## 7. Vercel 타임아웃 (10초) 고려

| 한도 | 설정 |
|---|---|
| 함수 전체 | 10초 (CON-07) |
| 트랜잭션 권장 | **≤ 8초** (여유 2초) |
| 단일 쿼리 권장 | ≤ 200ms (`statement_timeout`) |

```ts
// Prisma client 초기화 시
new PrismaClient({
  log: ['warn', 'error'],
  errorFormat: 'minimal',
})
```

> Supabase Pooler (pgbouncer)는 트랜잭션 모드 제한. 인터랙티브 트랜잭션 사용 시 `DIRECT_URL` (포트 5432) 사용 필수. `DATABASE_URL` (포트 6543, pooler)는 단순 쿼리용.

---

## 8. revalidatePath는 트랜잭션 밖

```ts
'use server'
export async function mergeLots(input: unknown) {
  const data = MergeInput.parse(input)

  const result = await prisma.$transaction(async (tx) => {
    // ... 트랜잭션 작업
    return merged
  })

  // 트랜잭션 commit 이후에 호출 (rollback 시 캐시 무효화 안 함)
  revalidatePath('/dashboard/lots')

  return { ok: true, data: { id: result.id }}
}
```

---

## 9. PR 체크리스트
- [ ] 2개 이상 mutation은 트랜잭션으로 묶음
- [ ] 외부 API 호출은 트랜잭션 밖으로
- [ ] 정합성 critical (재고/병합)은 `isolationLevel: 'Serializable'` + 재시도
- [ ] `timeout: 8000` 명시 (Vercel 10s 한도)
- [ ] auditLog는 트랜잭션 내부에 포함 (원자성)
- [ ] revalidatePath는 트랜잭션 후
- [ ] Supabase 사용 시 인터랙티브 트랜잭션은 `DIRECT_URL` 경유

## See also
- `310-server-action-patterns` — `$transaction` 예시
- `313-audit-log-helper` — 트랜잭션 내부에서는 `tx.auditLog.create()`
- `315-api-error-handling` — `P2002`/`P2034` 처리
