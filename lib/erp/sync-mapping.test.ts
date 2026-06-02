import { describe, it, expect } from 'vitest';
import {
  erpApiKeyOk,
  toCreateData,
  computeItemChanges,
  summarize,
  type ExistingItem,
} from './sync-mapping';

describe('erpApiKeyOk (T10.2)', () => {
  it('일치 true, 불일치/빈 env false', () => {
    expect(erpApiKeyOk('k', 'k')).toBe(true);
    expect(erpApiKeyOk('x', 'k')).toBe(false);
    expect(erpApiKeyOk('k', undefined)).toBe(false);
  });
});

describe('toCreateData (T10.2)', () => {
  it('material 미제공 시 기본 silicone', () => {
    expect(toCreateData({ productCode: 'P1' })).toEqual({
      productCode: 'P1',
      customerCode: null,
      hwasungCode: null,
      material: 'silicone',
    });
  });
});

describe('computeItemChanges 변경분 판정 (T10.2)', () => {
  const existing: ExistingItem = { customerCode: 'C1', hwasungCode: 'H1', material: 'silicone' };

  it('동일하면 null(쓰기 생략)', () => {
    expect(computeItemChanges(existing, { productCode: 'P1', customerCode: 'C1', hwasungCode: 'H1', material: 'silicone' })).toBeNull();
  });

  it('customerCode만 변경 → 해당 필드만', () => {
    expect(computeItemChanges(existing, { productCode: 'P1', customerCode: 'C2', hwasungCode: 'H1' })).toEqual({ customerCode: 'C2' });
  });

  it('material 변경 감지, 빈 material은 무시', () => {
    expect(computeItemChanges(existing, { productCode: 'P1', customerCode: 'C1', hwasungCode: 'H1', material: 'EPDM' })).toEqual({ material: 'EPDM' });
    expect(computeItemChanges(existing, { productCode: 'P1', customerCode: 'C1', hwasungCode: 'H1' })).toBeNull();
  });
});

describe('summarize (T10.2)', () => {
  it('total 합산', () => {
    expect(summarize({ created: 2, updated: 3, unchanged: 5 })).toEqual({ created: 2, updated: 3, unchanged: 5, total: 10 });
  });
});
