import { describe, it, expect } from 'vitest';
import { SEED_ITEMS } from '../../prisma/seed-items';

describe('시드 품번 데이터 (T2.1)', () => {
  it('AC T2.1-1: 47품번', () => {
    expect(SEED_ITEMS).toHaveLength(47);
  });

  it('productCode 중복 없음', () => {
    const codes = SEED_ITEMS.map((i) => i.productCode);
    expect(new Set(codes).size).toBe(47);
  });

  it('AC T2.1-1: 모두 material=silicone', () => {
    expect(SEED_ITEMS.every((i) => i.material === 'silicone')).toBe(true);
  });

  it('AC T2.1-1: E그룹·headPin 비어있는 행 0건', () => {
    const empty = SEED_ITEMS.filter((i) => !i.extrusionGroup || !i.headPin);
    expect(empty).toHaveLength(0);
  });

  it('extrusionGroup은 1~8 범위', () => {
    expect(SEED_ITEMS.every((i) => i.extrusionGroup >= 1 && i.extrusionGroup <= 8)).toBe(true);
  });
});
