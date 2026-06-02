import { describe, it, expect } from 'vitest';
import { checkRuleViolations, type RuleEntry } from './rule-check';

function entry(itemId: string, slot: string): RuleEntry {
  return { itemId, productCode: itemId, slot, equipmentCode: 'LP_1', date: '2026-05-18', scheduleId: `${itemId}-${slot}` };
}

describe('checkRuleViolations (T5.7)', () => {
  const allowed = { P1: ['LP_TOP_1', 'LP_TOP_2'] };

  it('허용 슬롯 → 위반 없음', () => {
    expect(checkRuleViolations([entry('P1', 'LP_TOP_1')], allowed)).toHaveLength(0);
  });

  it('위치 X 슬롯 → 위반 1건(차단 아님, 경고)', () => {
    const v = checkRuleViolations([entry('P1', 'LP_BOT_9')], allowed);
    expect(v).toHaveLength(1);
    expect(v[0].reason).toContain('위치 제약');
  });

  it('allowedSlots 미정의 품번은 점검 생략', () => {
    expect(checkRuleViolations([entry('UNKNOWN', 'X')], allowed)).toHaveLength(0);
  });

  it('여러 배치 혼합', () => {
    const v = checkRuleViolations([entry('P1', 'LP_TOP_1'), entry('P1', 'LP_BOT_1'), entry('P1', 'LP_TOP_2')], allowed);
    expect(v).toHaveLength(1);
  });
});
