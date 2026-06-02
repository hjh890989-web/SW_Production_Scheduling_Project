import type { ILlmProvider } from './ILlmProvider';
import { MockLlmProvider } from './MockLlmProvider';

/**
 * LLM provider 선택 (T12.7.2). env `OLLAMA_URL` 설정 시 사내 Ollama 대상이나,
 * 실 구현 미도입(Phase 2)이므로 현재는 Mock 귀결. 외부 LLM SaaS는 금지(D8).
 */
export interface LlmResolution {
  provider: 'mock';
  reason: string;
}

export function resolveLlmProvider(ollamaUrl: string | undefined): LlmResolution {
  if (ollamaUrl) return { provider: 'mock', reason: 'OLLAMA_URL 설정됨이나 실 구현 미도입(Phase 2) → mock' };
  return { provider: 'mock', reason: '기본 mock(사내 Ollama 미가동)' };
}

export function createLlmProvider(ollamaUrl: string | undefined = process.env.OLLAMA_URL): ILlmProvider {
  const r = resolveLlmProvider(ollamaUrl);
  if (ollamaUrl) console.warn(`[LLM] ${r.reason}`);
  return new MockLlmProvider();
}
