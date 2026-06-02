import { describe, it, expect } from 'vitest';
import { resolveLlmProvider, createLlmProvider } from './factory';
import { MockLlmProvider } from './MockLlmProvider';

describe('resolveLlmProvider (T12.7.2)', () => {
  it('OLLAMA_URL 유무와 무관하게 현재 mock 귀결(Phase 2 미도입)', () => {
    expect(resolveLlmProvider(undefined).provider).toBe('mock');
    expect(resolveLlmProvider('http://ollama:11434').provider).toBe('mock');
    expect(resolveLlmProvider('http://ollama:11434').reason).toMatch(/Phase 2/);
  });
});

describe('createLlmProvider / Mock (T12.7.2, AC T12.7.2-1)', () => {
  it('항상 MockLlmProvider', () => {
    expect(createLlmProvider(undefined)).toBeInstanceOf(MockLlmProvider);
    expect(createLlmProvider('http://ollama:11434')).toBeInstanceOf(MockLlmProvider);
  });

  it('Mock complete는 결정적 응답', async () => {
    const res = await new MockLlmProvider().complete('테스트 프롬프트');
    expect(res.model).toBe('mock-0');
    expect(res.text).toContain('[mock]');
    expect(res.tokens).toBeGreaterThan(0);
  });
});
