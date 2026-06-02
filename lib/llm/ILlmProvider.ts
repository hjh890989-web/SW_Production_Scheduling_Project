/**
 * T12.7.2 LLM provider 추상화. Phase 2 사내 Ollama(self-hosted) 교체 대비.
 * 외부 LLM SaaS 금지(D8) — 실 구현은 사내 Ollama만 허용하며 현재는 Mock(미가동).
 */
export interface LlmResponse {
  text: string;
  model: string;
  /** 토큰 사용량(있을 때) — 비용/정확도 검증(T12.7.4)용. */
  tokens?: number;
}

export interface ILlmProvider {
  readonly kind: 'mock' | 'ollama';
  complete(prompt: string): Promise<LlmResponse>;
}
