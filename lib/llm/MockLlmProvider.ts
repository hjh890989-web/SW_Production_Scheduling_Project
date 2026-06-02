import type { ILlmProvider, LlmResponse } from './ILlmProvider';

/**
 * Mock LLM provider (T12.7.2). 외부/네트워크 호출 없이 결정적 응답(사내망·외부 LLM 금지 준수).
 * 실 추론은 Phase 2 사내 Ollama 도입 후 OllamaProvider로 교체.
 */
export class MockLlmProvider implements ILlmProvider {
  readonly kind = 'mock' as const;

  async complete(prompt: string): Promise<LlmResponse> {
    return {
      text: `[mock] ${prompt.slice(0, 40)}`,
      model: 'mock-0',
      tokens: prompt.length,
    };
  }
}
