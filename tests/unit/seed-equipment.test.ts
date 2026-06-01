import { describe, it, expect } from 'vitest';
import { SEED_EQUIPMENT } from '../../prisma/seed-equipment';
import { assertValidSlot, LP_SLOTS, IC_SLOTS } from '../../lib/master/equipment';

describe('장비 시드 (T2.2)', () => {
  it('AC T2.2-1: 7대, type 분포 MOLDING_LP×4 / MOLDING_IC×1 / EXTRUSION×2', () => {
    expect(SEED_EQUIPMENT).toHaveLength(7);
    const dist = SEED_EQUIPMENT.reduce<Record<string, number>>((a, e) => {
      a[e.type] = (a[e.type] ?? 0) + 1;
      return a;
    }, {});
    expect(dist).toEqual({ MOLDING_LP: 4, MOLDING_IC: 1, EXTRUSION: 2 });
  });

  it('AC T2.2-2: 저압 8슬롯, IC 6슬롯', () => {
    expect(LP_SLOTS).toHaveLength(8);
    expect(IC_SLOTS).toHaveLength(6);
    const lp = SEED_EQUIPMENT.find((e) => e.code === 'LP_1');
    const ic = SEED_EQUIPMENT.find((e) => e.code === 'IC_1');
    expect(lp?.capacity.slots).toHaveLength(8);
    expect(ic?.capacity.slots).toHaveLength(6);
  });

  it('AC T2.2-F1: 미정의 SlotPosition → throw', () => {
    expect(() => assertValidSlot('LP_TOP_1')).not.toThrow();
    expect(() => assertValidSlot('LP_MIDDLE_9')).toThrow(/정의되지 않은/);
  });

  it('code 중복 없음', () => {
    expect(new Set(SEED_EQUIPMENT.map((e) => e.code)).size).toBe(7);
  });
});
