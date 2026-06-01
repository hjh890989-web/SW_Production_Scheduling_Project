# 비활성화된 Agent Skills (D8 정책 위배)

## 격리 이유

본 폴더의 skill들은 [Stage_A/4_개발계획서_v1.3.md](../../Stage_A/4_개발계획서_v1.3.md) **D8(사내망 전용 정책)** 및 [Stage_C/19_PRD_v1.4.md](../../Stage_C/19_PRD_v1.4.md) **§5.3 외부 LLM·SaaS 금지** 조항과 직접 충돌하여 격리되었습니다.

| Skill | 충돌 원인 | 격리 일자 |
|---|---|---|
| `302-gemini-throttle` | Google Gemini API 외부 호출 패턴 명시 (사내망 정책 위배) | 2026-06-01 |
| `305-vercel-ai-sdk-rules` | Vercel AI SDK + `GOOGLE_GENERATIVE_AI_API_KEY` 사용 권장 (D8/D19 위배) | 2026-06-01 |

## 향후 활용

Phase 2에서 **사내 자체호스팅 LLM(Ollama 또는 vLLM, Sprint 12.7)** 도입 시 본 skill의 **구조·패턴만 차용**하여 `.agents/skills/307-local-llm-rules` (또는 유사 명칭)로 신규 작성 권장. 외부 API 호출 코드는 모두 제거하고 사내 엔드포인트(`http://localhost:11434` 등) 기준으로 재작성 필요.

## 복원 정책

본 폴더의 skill을 `.agents/skills/`로 복원하려면:
1. PM 승인 (D8 정책 변경 또는 예외 결정)
2. 신규 ADR 발행 (D8 보강 또는 폐기)
3. 외부 API 호출 코드를 사내 자체호스팅으로 전환

위 3개 조건 모두 충족하지 않은 채 복원 시 보안·NDA 위반 위험이 있습니다.
