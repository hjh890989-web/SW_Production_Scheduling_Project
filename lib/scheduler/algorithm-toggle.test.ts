import { describe, it, expect } from 'vitest';
import { toggleAlgorithm, needsSolverNotice, ALGORITHM_LABEL } from './algorithm-toggle';

describe('algorithm-toggle (T12.3.1)', () => {
  it('룰 ↔ 솔버 전환', () => {
    expect(toggleAlgorithm('rule')).toBe('solver');
    expect(toggleAlgorithm('solver')).toBe('rule');
  });

  it('솔버 선택 시 안내 필요', () => {
    expect(needsSolverNotice('solver')).toBe(true);
    expect(needsSolverNotice('rule')).toBe(false);
  });

  it('라벨', () => {
    expect(ALGORITHM_LABEL.rule).toContain('룰');
    expect(ALGORITHM_LABEL.solver).toContain('OR-Tools');
  });
});
