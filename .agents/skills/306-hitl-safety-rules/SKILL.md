---
name: 306-hitl-safety-rules
description: HITL (Human-in-the-Loop) 4대 원칙 구현 가이드 — PENDING_APPROVAL 패턴, 수동 모드 전환, XAI 한국어 설명, 감사 로그. AI 코드 작성 시 반드시 참조.
---

# 306 — HITL Safety Rules

본 스킬은 FactoryAI의 **모든 AI 출력 경로**에서 강제 적용됩니다. 위반 시 PR 거절.

> 원천: [`.agents/rules/004-hitl-and-security.md`](../../rules/004-hitl-and-security.md) §1, SRS §3-C, PRD §3-C

---

## 원칙 ① — AI 단독 외부 발행 / 물리 행위 금지

AI는 사람 승인 전까지 다음을 **할 수 없습니다**:
- 외부 시스템에 발행 (ERP write, 정부 포털, 이메일, Slack, SMS, API call)
- 물리 장비 제어 (액추에이터, 알람, 출력)
- 결제·계약·법적 효력 행위
- 실 사용자 데이터의 영구 변경 (DELETE/UPDATE on production rows)

### 구현 패턴 — 3단 분리

```
AI 추론 → DB(status: PENDING_APPROVAL) → 사용자 검토 UI → Approve 액션 → 외부 효과
                                                    └→ Reject → 학습 피드백
```

```ts
// ❌ 위반
const result = await ai.generate(...)
await sendEmailToCustomer(result.summary)   // HITL 위반

// ✅ 준수
const result = await ai.generate(...)
const suggestion = await prisma.aiSuggestion.create({
  data: { ...result, status: 'PENDING_APPROVAL' },
})
// → 사용자가 UI에서 Approve 클릭 시 별도 Server Action에서 sendEmail 호출
```

### Approve 액션 구현

```ts
// app/(dashboard)/quality/actions.ts
'use server'

export async function approveAiSuggestion(id: string) {
  const session = await requireRole(['ADMIN', 'QC'])

  const suggestion = await prisma.aiSuggestion.findUnique({ where: { id }})
  if (!suggestion) throw new NotFoundError()
  if (suggestion.status !== 'PENDING_APPROVAL') {
    throw new ValidationError('이미 처리된 항목입니다.')
  }

  // 1. 상태 전환
  const updated = await prisma.aiSuggestion.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: new Date() },
  })

  // 2. 감사 로그
  await prisma.auditLog.create({
    data: {
      actor: `user-${session.user.id}`,
      action: 'APPROVE',
      targetType: 'AiSuggestion',
      targetId: id,
      before: suggestion,
      after: updated,
    },
  })

  // 3. 이제서야 외부 효과 발생
  await triggerDownstreamEffect(updated)

  revalidatePath('/quality')
  return { ok: true }
}
```

---

## 원칙 ② — 수동 판단 모드 즉시 전환 (≤5분, 30분 자동 복귀)

AI 정확도가 임계치 미달 시 **5분 이내**에 수동 입력 모드로 전환.

### 구현 — 정확도 모니터

```ts
// lib/ai/health.ts
const ACCURACY_THRESHOLD = 0.7
const WINDOW_MINUTES = 30

export async function checkAIHealth(): Promise<HealthStatus> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)
  const suggestions = await prisma.aiSuggestion.findMany({
    where: { createdAt: { gte: since }, status: { in: ['APPROVED', 'REJECTED'] }},
  })
  if (suggestions.length < 3) return { mode: 'AUTO', accuracy: null }

  const approved = suggestions.filter(s => s.status === 'APPROVED').length
  const accuracy = approved / suggestions.length

  if (accuracy < ACCURACY_THRESHOLD) {
    await activateManualMode()
    await notifyOperators(`AI 정확도 ${(accuracy*100).toFixed(1)}% — 수동 입력 모드로 전환되었습니다.`)
    return { mode: 'MANUAL', accuracy }
  }
  return { mode: 'AUTO', accuracy }
}

async function activateManualMode() {
  await prisma.systemSetting.upsert({
    where: { key: 'ai_mode' },
    update: { value: 'MANUAL', activatedAt: new Date() },
    create: { key: 'ai_mode', value: 'MANUAL', activatedAt: new Date() },
  })
}
```

### 호출 시점
- Cron 또는 webhook (Phase 2)
- 또는 사용자 액션 후 piggyback 호출 (`await checkAIHealth()` after reject)

### 자동 복귀
- 수동 모드 활성화 후 30분 경과 + 신규 reject 0건 → 자동으로 AUTO 복귀

---

## 원칙 ③ — XAI 한국어 설명

모든 이상 탐지·분류 결과는 다음 정보를 **사용자에게 노출**:

| 항목 | 형식 |
|:---|:---|
| **판단 근거** | 한국어 1~3문장 |
| **핵심 feature** | 3개 이상, 가중치(0~1) |
| **신뢰도** | 0~100% |
| **추천 액션** (선택) | 한국어 한 문장 |

### 백엔드 책임 (이 skill의 핵심)
백엔드는 다음 JSON 계약을 보장한다. UI 렌더링은 프론트엔드 책임 (`.claude/agents/nextjs-frontend.md` 참조).

```ts
// API 응답 / DB 저장 표준 형식 — Zod schema로 강제
const XaiSuggestionResponse = z.object({
  id: z.string().cuid(),
  decision: z.string(),                                // 'DEFECT' | 'OK' | ...
  reason: z.string().min(10),                          // 한국어 1~3 문장
  topFeatures: z.array(z.object({
    name: z.string(),                                  // 한국어 이름 권장
    value: z.union([z.number(), z.string()]),
    weight: z.number().min(0).max(1),
  })).min(3),
  confidence: z.number().min(0).max(1),
  status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED']),
  recommendation: z.string().optional(),
})
```

> UI 컴포넌트(`SuggestionCard`) 구현 예시는 `.claude/agents/nextjs-frontend.md` 또는 별도 디자인 시스템 문서를 참조. 백엔드는 위 schema 준수만 책임.

---

## 원칙 ④ — 모든 AI 판단 → audit_log

모든 AI 결과 생성·변경 시 `auditLog.create()` 호출 (R4).

```ts
await prisma.auditLog.create({
  data: {
    actor: `ai-gemini-1.5-flash`,
    action: 'AUTO_FLAG',
    targetType: 'AiSuggestion',
    targetId: suggestion.id,
    after: suggestion,
    confidence: explanation.confidence,
    ipAddress: req.ip,
    userAgent: req.headers.get('user-agent') ?? null,
  },
})
```

### Retention
- 최소 1년 (보안 감사 대비)
- CSV/JSON export 쿼리 제공 (`scripts/export-audit-log.ts`)
- Supabase Free 500MB 한도 모니터링 — 절약 위해 90일 후 `actor='ai-*'` 행은 cold storage로

---

## 빠른 체크리스트 (PR review용)

AI 출력을 다루는 PR에 대해:

- [ ] AI 결과는 `status: 'PENDING_APPROVAL'` 또는 동등 상태로 저장
- [ ] 외부 발행/물리 행위는 Approve 액션 안에서만 호출
- [ ] XAI 한국어 설명 (reason + topFeatures + confidence) 노출
- [ ] 사용자 UI에 "AI 생성" 라벨 시각화
- [ ] 신뢰도 수치 표시
- [ ] Approve/Reject 액션 모두 구현
- [ ] 모든 단계 audit_log 기록
- [ ] AI 정확도 모니터(`checkAIHealth`)에 영향 없는지 확인

## 위반 사고 시 절차

1. 즉시 해당 Server Action / API 비활성 (feature flag)
2. 감사 로그 export → 노출 범위 파악
3. 영향받은 사용자에게 알림 (CISO 협의)
4. 원인 PR revert
5. 재발 방지 코드 룰 추가

---

## See also

- [.agents/rules/004-hitl-and-security.md](../../rules/004-hitl-and-security.md)
- [.agents/skills/305-vercel-ai-sdk-rules/SKILL.md](../305-vercel-ai-sdk-rules/SKILL.md)
- [.claude/agents/ai-integration.md](../../../.claude/agents/ai-integration.md)
- SRS §3-C HITL 4대 원칙
