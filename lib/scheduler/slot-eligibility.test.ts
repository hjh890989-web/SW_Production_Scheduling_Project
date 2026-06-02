import { describe, it, expect } from 'vitest';
import { deriveSchedulerItem } from './slot-eligibility';

const LP = ['LP_TOP_1', 'LP_TOP_2', 'LP_UPMID_1', 'LP_BOT_1'];
const IC = ['IC_TOP_1', 'IC_MID_1'];

describe('deriveSchedulerItem (T5.4)', () => {
  it('LP 품번 + lpPosTop=true → TOP 포함 전 슬롯', () => {
    const r = deriveSchedulerItem({ id: 'i', productCode: 'P', lpMoldsPerAngle: 10, icMoldsPerAngle: 0, lpPosTop: true }, LP, IC);
    expect(r?.equipmentType).toBe('MOLDING_LP');
    expect(r?.allowedSlots).toEqual(LP);
  });

  it('LP 품번 + lpPosTop=false → TOP 제외', () => {
    const r = deriveSchedulerItem({ id: 'i', productCode: 'P', lpMoldsPerAngle: 10, icMoldsPerAngle: 0, lpPosTop: false }, LP, IC);
    expect(r?.allowedSlots).toEqual(['LP_UPMID_1', 'LP_BOT_1']);
  });

  it('IC 품번(lp=0) → IC 슬롯', () => {
    const r = deriveSchedulerItem({ id: 'i', productCode: 'P', lpMoldsPerAngle: 0, icMoldsPerAngle: 20, lpPosTop: false }, LP, IC);
    expect(r?.equipmentType).toBe('MOLDING_IC');
    expect(r?.allowedSlots).toEqual(IC);
  });

  it('성형 불가(둘 다 0) → null', () => {
    expect(deriveSchedulerItem({ id: 'i', productCode: 'P', lpMoldsPerAngle: 0, icMoldsPerAngle: 0, lpPosTop: false }, LP, IC)).toBeNull();
  });
});
