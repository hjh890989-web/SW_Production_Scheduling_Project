import { describe, it, expect } from 'vitest';
import { applyInventoryDelta, productionDelta, deliveryDelta } from './delta';

describe('applyInventoryDelta (T9.3)', () => {
  it('생산 적용 → 증가, 음수 아님', () => {
    expect(applyInventoryDelta(0, productionDelta(100))).toEqual({ next: 100, negative: false });
    expect(applyInventoryDelta(50, productionDelta(10))).toEqual({ next: 60, negative: false });
  });

  it('납품이 재고 초과 → negative=true (롤백 대상, AC T9.3-F1)', () => {
    expect(applyInventoryDelta(30, deliveryDelta(50))).toEqual({ next: -20, negative: true });
  });

  it('정확히 0까지 차감은 허용', () => {
    expect(applyInventoryDelta(50, deliveryDelta(50))).toEqual({ next: 0, negative: false });
  });
});

describe('production/deliveryDelta 부호 (T9.3)', () => {
  it('생산 +, 납품 −', () => {
    expect(productionDelta(100)).toBe(100);
    expect(deliveryDelta(100)).toBe(-100);
  });
});
