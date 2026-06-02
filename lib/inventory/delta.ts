/**
 * T9.3 재고 델타 계산 — 순수 함수. 생산은 +, 납품은 −. 음수 재고는 적용 거부(AC T9.3-F1).
 */

export interface DeltaResult {
  next: number;
  /** next < 0 → 적용 불가(롤백 + 경고 대상). */
  negative: boolean;
}

export function applyInventoryDelta(current: number, delta: number): DeltaResult {
  const next = current + delta;
  return { next, negative: next < 0 };
}

/** 생산 실적 → 재고 증가량(+). */
export function productionDelta(quantity: number): number {
  return quantity;
}

/** 납품 실적 → 재고 감소량(−). */
export function deliveryDelta(quantity: number): number {
  return -quantity;
}
