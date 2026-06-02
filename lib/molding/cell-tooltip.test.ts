import { describe, it, expect } from 'vitest';
import { explainCell } from './cell-tooltip';

describe('explainCell (T5.9)', () => {
  it('품번·회전수·근거 포함', () => {
    const t = explainCell({ productCode: 'P1', rotations: 8, status: 'AUTO', ruleViolation: false });
    expect(t).toContain('품번 P1');
    expect(t).toContain('8회');
    expect(t).toContain('자동');
  });

  it('수동/확정 라벨', () => {
    expect(explainCell({ productCode: 'P', rotations: 1, status: 'MANUAL', ruleViolation: false })).toContain('수동');
    expect(explainCell({ productCode: 'P', rotations: 1, status: 'CONFIRMED', ruleViolation: false })).toContain('확정');
  });

  it('룰 위반 경고 포함', () => {
    expect(explainCell({ productCode: 'P', rotations: 1, status: 'MANUAL', ruleViolation: true })).toContain('위치 제약');
  });
});
