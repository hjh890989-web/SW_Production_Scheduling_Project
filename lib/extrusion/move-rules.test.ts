import { describe, it, expect } from 'vitest';
import { evaluateExtMove } from './move-rules';

describe('evaluateExtMove (T6.6)', () => {
  it('호환 압출기 → 위반 없음', () => {
    expect(evaluateExtMove('NEW', { extruderFord: false, extruderNew: true }).ruleViolation).toBe(false);
    expect(evaluateExtMove('FORD', { extruderFord: true, extruderNew: false }).ruleViolation).toBe(false);
  });

  it('비호환 압출기로 이동 → ruleViolation=true(이동은 허용)', () => {
    expect(evaluateExtMove('NEW', { extruderFord: true, extruderNew: false }).ruleViolation).toBe(true);
  });
});
