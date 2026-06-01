---
name: 305-vercel-ai-sdk-rules
description: Vercel AI SDK + Gemini API 표준 사용법 — generateText, generateObject, streamText, 멀티모달, Rate Limit 큐 통합 패턴.
---

# 305 — Vercel AI SDK + Gemini Rules

본 스킬은 FactoryAI의 모든 AI/LLM 호출에 대한 표준 패턴입니다. **모든 Gemini 호출은 `lib/ai/queue.ts`의 큐 경유**가 절대 규칙입니다 (CON-12 / R3).

---

## 1. 설치 & 환경

```bash
npm install ai @ai-sdk/google zod
```

```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
```

## 2. 모델 선택

| 작업 | 모델 | 이유 |
|:---|:---|:---|
| 텍스트 요약, 한국어 설명 (XAI) | `gemini-1.5-flash` | 빠르고 무료 |
| 멀티모달 (이미지 분석) | `gemini-1.5-flash` | 무료 티어 지원 |
| 복잡 추론, 긴 문서 분석 | `gemini-1.5-pro` | 정확도 ↑ (단, RPM 더 낮음) |
| 코드 생성 | 사용 ❌ | 사용자 IDE에 맡김 |

## 3. 큐 경유 호출 (절대)

```ts
// ❌ 직접 호출 — 절대 금지
import { generateText } from 'ai'
const { text } = await generateText({ model, prompt })

// ✅ 큐 경유
import { aiQueue } from '@/lib/ai/queue'
const result = await aiQueue.enqueue(() =>
  generateText({ model: google('gemini-1.5-flash'), prompt })
)
```

## 4. 표준 호출 패턴

### A. 텍스트 생성

```ts
// lib/ai/text.ts
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { aiQueue } from './queue'

export async function summarizeAuditFindings(findings: string) {
  const { text } = await aiQueue.enqueue(() =>
    generateText({
      model: google('gemini-1.5-flash'),
      system: '제조 현장 감사 결과를 한국어로 1단락 요약하세요. 사실만 포함, 추측 금지.',
      prompt: findings,
      maxTokens: 300,
    })
  )
  return text
}
```

### B. 구조화 출력 (`generateObject`)

```ts
// lib/ai/parse-vision.ts
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { aiQueue } from './queue'

const ProcessStateSchema = z.object({
  machineId: z.string(),
  status: z.enum(['RUNNING', 'IDLE', 'ERROR']),
  defectCount: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  observations: z.array(z.string()).max(5),
})

export async function parseFactoryImage(imageDataUrl: string) {
  return aiQueue.enqueue(() =>
    generateObject({
      model: google('gemini-1.5-flash'),
      schema: ProcessStateSchema,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '공정 라인 이미지에서 기계 상태와 불량 카운트를 분석하세요.' },
          { type: 'image', image: imageDataUrl },
        ],
      }],
    })
  )
}
```

### C. 스트리밍 (UX 개선, 짧은 응답에 한정)

```ts
// app/api/v1/explain/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { requireRole } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  await requireRole(['ADMIN', 'QC'])
  const { lotId } = await req.json()
  const features = await getLotFeatures(lotId)

  // ⚠️ 스트리밍은 큐 우회. 짧은 응답에만, 긴 작업은 enqueue로 전체 받아 저장.
  const result = streamText({
    model: google('gemini-1.5-flash'),
    prompt: `다음 features의 AI 판단 근거를 한국어로 설명: ${JSON.stringify(features)}`,
  })
  return result.toDataStreamResponse()
}
```

## 5. XAI 한국어 설명 표준 포맷

모든 이상 탐지 결과는 다음 JSON 구조로 저장:

```ts
type XaiExplanation = {
  reason: string              // 한국어 문장 (1~3문장)
  topFeatures: Array<{
    name: string              // 한국어 이름 권장 ("진동수")
    value: number | string
    weight: number            // 0~1, 영향력
  }>
  confidence: number          // 0~1
  recommendation?: string     // 사용자에게 권하는 다음 액션
}
```

## 6. 멀티모달 입력 형식

```ts
// 이미지
{ type: 'image', image: 'data:image/jpeg;base64,/9j/4AAQ...' }

// 또는 URL
{ type: 'image', image: new URL('https://...') }

// 오디오 (Gemini 1.5는 audio 지원)
{ type: 'file', data: audioBase64, mimeType: 'audio/wav' }
```

> 이미지 ≤10MB, 오디오 ≤9.5MB (Gemini 한계). 초과 시 사전 압축.

## 7. 안전 필터 / 에러 처리

```ts
try {
  const result = await aiQueue.enqueue(() => generateText({...}))
  return result
} catch (err: any) {
  if (err?.code === 'SAFETY_BLOCKED') {
    // Gemini 안전 필터 발동 — 프롬프트 수정 또는 사용자에게 안내
    return { error: 'AI가 안전 정책상 응답하지 않았습니다. 다른 표현으로 시도해 주세요.' }
  }
  if (err?.status === 429) {
    // 큐가 backoff 처리하지만 만약 노출되면
    return { error: '잠시 후 다시 시도해 주세요.' }
  }
  throw err
}
```

## 8. 비용 / 토큰 관리

- 무료 티어 한도: **15 RPM, 1500 RPD** (Gemini 1.5 Flash)
- 큐 안전마진: **≤12 RPM** (50ms gap)
- 긴 프롬프트는 system + user 분리, 동일 system은 cache (Gemini 자동)
- `maxTokens` 명시 → 비용 통제

## 9. 사용자에게 노출하는 패턴

- AI 응답은 **PENDING_APPROVAL** 상태로 저장 (R1)
- 사용자 검토 UI에 신뢰도 + topFeatures + 한국어 reason 노출
- "AI 생성" 라벨 시각적으로 명시 (배지 등)

## 10. Phase 2 (Local LLM 전환)

`vercel-ai-sdk`의 통합 인터페이스 덕분에 Provider 교체만으로 Ollama/vLLM 전환 가능:

```ts
// Phase 2
import { ollama } from 'ollama-ai-provider'
const model = ollama('llama3.1:70b')
// 나머지 코드 동일
```

> 단, Vision 멀티모달 지원 모델 선택 필요.

---

## See also

- [.agents/rules/004-hitl-and-security.md](../../rules/004-hitl-and-security.md) §1 (HITL)
- [.claude/agents/ai-integration.md](../../../.claude/agents/ai-integration.md)
- [.agents/skills/306-hitl-safety-rules/SKILL.md](../306-hitl-safety-rules/SKILL.md)
