/**
 * 룰 위반 점검 (T5.7 — 차단하지 않고 경고만). 순수 함수.
 * 위치 제약(O/X) 위반: 배치 슬롯이 품번 허용 슬롯(allowedSlots) 밖이면 위반.
 */
export interface RuleEntry {
  scheduleId?: string;
  itemId: string;
  productCode: string;
  slot: string;
  equipmentCode: string;
  date: string;
}

export interface RuleViolation {
  scheduleId?: string;
  productCode: string;
  slot: string;
  equipmentCode: string;
  date: string;
  reason: string;
}

export function checkRuleViolations(
  entries: RuleEntry[],
  allowedSlotsByItem: Record<string, string[]>,
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  for (const e of entries) {
    const allowed = allowedSlotsByItem[e.itemId];
    if (allowed && !allowed.includes(e.slot)) {
      violations.push({
        scheduleId: e.scheduleId,
        productCode: e.productCode,
        slot: e.slot,
        equipmentCode: e.equipmentCode,
        date: e.date,
        reason: '위치 제약(O/X) 위반 — 해당 슬롯에 배치 불가 품번',
      });
    }
  }
  return violations;
}
