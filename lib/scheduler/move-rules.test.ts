import { describe, it, expect } from 'vitest';
import { evaluateMove, isStaleUpdate } from './move-rules';

describe('move-rules (T5.6 J-MR-2)', () => {
  it('AC T5.6-1: 허용 슬롯으로 이동 → 위반 없음(차단 안 함)', () => {
    expect(evaluateMove('LP_TOP_1', ['LP_TOP_1', 'LP_TOP_2']).ruleViolation).toBe(false);
  });

  it('AC T5.6-2: 위치 X 슬롯 이동 → ruleViolation=true(허용은 됨)', () => {
    expect(evaluateMove('LP_BOT_9', ['LP_TOP_1']).ruleViolation).toBe(true);
  });

  it('AC T5.6-F1: updatedAt 불일치 → stale(충돌)', () => {
    expect(isStaleUpdate('2026-05-18T00:00:00.000Z', '2026-05-17T00:00:00.000Z')).toBe(true);
    expect(isStaleUpdate('2026-05-18T00:00:00.000Z', '2026-05-18T00:00:00.000Z')).toBe(false);
  });
});
