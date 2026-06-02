/**
 * 드래그 이동 규칙 판정 (T5.6 — J-MR-2). 순수 함수.
 * 차단하지 않는다: 위치 X(allowedSlots 밖) 슬롯도 이동 허용하되 ruleViolation=true(경고 대상).
 */
export function evaluateMove(targetSlot: string, allowedSlots: string[]): { ruleViolation: boolean } {
  return { ruleViolation: !allowedSlots.includes(targetSlot) };
}

/** 낙관적 락 충돌 여부(저장된 updatedAt ISO vs 클라이언트 기대값). */
export function isStaleUpdate(currentUpdatedAtISO: string, expectedUpdatedAtISO: string): boolean {
  return currentUpdatedAtISO !== expectedUpdatedAtISO;
}
