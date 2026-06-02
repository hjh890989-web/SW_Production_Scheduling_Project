import { describe, it, expect } from 'vitest';
import { summarizeStatus } from './status-summary';

const c = (status: 'AUTO' | 'MANUAL' | 'CONFIRMED', ruleViolation = false) => ({ status, ruleViolation });

describe('summarizeStatus (T5.8)', () => {
  it('상태별 집계', () => {
    const s = summarizeStatus([c('AUTO'), c('AUTO'), c('MANUAL'), c('CONFIRMED')]);
    expect(s).toMatchObject({ AUTO: 2, MANUAL: 1, CONFIRMED: 1, total: 4 });
  });

  it('룰 위반 수 집계', () => {
    expect(summarizeStatus([c('MANUAL', true), c('AUTO', false)]).ruleViolations).toBe(1);
  });

  it('빈 입력', () => {
    expect(summarizeStatus([])).toMatchObject({ total: 0, ruleViolations: 0 });
  });
});
