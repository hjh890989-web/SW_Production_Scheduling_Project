import { describe, it, expect } from 'vitest';
import {
  generateMoldingSchedule,
  type SchedulerInput,
  type SchedulerItem,
  type SchedulerEquipment,
} from './molding-scheduler';

// 영업일 10일(2026-05-11 월 ~ 05-22 금, 주말 제외)
const WORKDAYS = [
  '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15',
  '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22',
];

const LP_SLOTS = ['LP_TOP_1', 'LP_TOP_2', 'LP_UPMID_1', 'LP_UPMID_2'];
const IC_SLOTS = ['IC_TOP_1', 'IC_TOP_2'];

const EQUIPMENT: SchedulerEquipment[] = [
  { code: 'LP_1', type: 'MOLDING_LP', slots: LP_SLOTS, isActive: true },
  { code: 'IC_1', type: 'MOLDING_IC', slots: IC_SLOTS, isActive: true },
];

function item(id: string, opts: Partial<SchedulerItem> = {}): SchedulerItem {
  return {
    itemId: id,
    productCode: id,
    moldsPerAngle: 10,
    equipmentType: 'MOLDING_LP',
    allowedSlots: LP_SLOTS,
    ...opts,
  };
}

function run(over: Partial<SchedulerInput>): ReturnType<typeof generateMoldingSchedule> {
  const base: SchedulerInput = {
    orders: [],
    items: {},
    equipment: EQUIPMENT,
    workdays: WORKDAYS,
    rotationsPerDay: 8,
    rotationsPerNight: 10,
    d2Days: 2,
  };
  return generateMoldingSchedule({ ...base, ...over });
}

describe('generateMoldingSchedule — 핵심 보장 (T5.2)', () => {
  it('AC T5.2-1: 슬롯 X(allowedSlots 밖)에 배치 0건', () => {
    const it1 = item('P1', { allowedSlots: ['LP_TOP_1'] }); // 단 1슬롯만 O
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 80 }], items: { P1: it1 } });
    expect(r.schedules.every((s) => it1.allowedSlots.includes(s.slot))).toBe(true);
  });

  it('AC T5.2-2: 모든 배치는 납품일 D-2(영업일) 이내', () => {
    // 납품 2026-05-22(idx9) → deadline idx7 = 2026-05-20
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 50 }], items: { P1: item('P1') } });
    expect(r.schedules.every((s) => s.date <= '2026-05-20')).toBe(true);
  });

  it('회전수 = ceil(수량/앵글당금형) 만큼 배치', () => {
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 35 }], items: { P1: item('P1', { moldsPerAngle: 10 }) } });
    const total = r.schedules.reduce((a, s) => a + s.rotations, 0);
    expect(total).toBe(Math.ceil(35 / 10)); // 4 회전
  });

  it('AC T5.2-F1: 가용 슬롯 부족 → 부분 배치 + warning(throw X)', () => {
    const tiny = { ...EQUIPMENT[0], slots: ['LP_TOP_1'] };
    const r = run({
      equipment: [tiny],
      orders: [{ itemId: 'P1', deliveryDate: '2026-05-13', quantity: 100000 }],
      items: { P1: item('P1', { allowedSlots: ['LP_TOP_1'], moldsPerAngle: 1 }) },
    });
    expect(r.warnings.some((w) => w.reason.includes('부분 배치'))).toBe(true);
    expect(r.schedules.length).toBeGreaterThan(0);
  });

  it('품번 마스터 없음 → warning, 배치 0', () => {
    const r = run({ orders: [{ itemId: 'NOPE', deliveryDate: '2026-05-22', quantity: 10 }] });
    expect(r.schedules).toHaveLength(0);
    expect(r.warnings[0].reason).toContain('마스터');
  });

  it('allowedSlots 비어있음 → warning', () => {
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 10 }], items: { P1: item('P1', { allowedSlots: [] }) } });
    expect(r.schedules).toHaveLength(0);
    expect(r.warnings[0].reason).toContain('슬롯');
  });

  it('D-2 마감 전 영업일 없음 → warning', () => {
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-12', quantity: 10 }], items: { P1: item('P1') } });
    expect(r.warnings.some((w) => w.reason.includes('D-2'))).toBe(true);
  });

  it('IC 품번은 IC 가류기 슬롯에만 배치', () => {
    const r = run({
      orders: [{ itemId: 'IC1', deliveryDate: '2026-05-22', quantity: 30 }],
      items: { IC1: item('IC1', { equipmentType: 'MOLDING_IC', allowedSlots: IC_SLOTS }) },
    });
    expect(r.schedules.length).toBeGreaterThan(0);
    expect(r.schedules.every((s) => s.equipmentCode === 'IC_1' && IC_SLOTS.includes(s.slot))).toBe(true);
  });

  it('비가동 장비에는 배치하지 않는다', () => {
    const r = run({
      equipment: [{ ...EQUIPMENT[0], isActive: false }, EQUIPMENT[1]],
      orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 10 }],
      items: { P1: item('P1') },
    });
    expect(r.schedules.every((s) => s.equipmentCode !== 'LP_1')).toBe(true);
  });

  it('납품일이 비영업일이면 직전 영업일 기준 D-2', () => {
    // 2026-05-23(토, 비영업) → 직전 영업일 05-22(idx9) → deadline 05-20
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-23', quantity: 10 }], items: { P1: item('P1') } });
    expect(r.schedules.every((s) => s.date <= '2026-05-20')).toBe(true);
  });

  it('모든 status는 AUTO', () => {
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 30 }], items: { P1: item('P1') } });
    expect(r.schedules.every((s) => s.status === 'AUTO')).toBe(true);
  });
});

// 매트릭스: 다양한 allowedSlots 제한에서도 슬롯 X 배치 0건 (정확도 100%) — 16 케이스
const SLOT_SUBSETS = [
  ['LP_TOP_1'], ['LP_TOP_2'], ['LP_UPMID_1'], ['LP_UPMID_2'],
  ['LP_TOP_1', 'LP_TOP_2'], ['LP_TOP_1', 'LP_UPMID_1'], ['LP_TOP_2', 'LP_UPMID_2'], ['LP_UPMID_1', 'LP_UPMID_2'],
  ['LP_TOP_1', 'LP_TOP_2', 'LP_UPMID_1'], ['LP_TOP_2', 'LP_UPMID_1', 'LP_UPMID_2'],
  LP_SLOTS, ['LP_TOP_1', 'LP_UPMID_2'], ['LP_TOP_2', 'LP_UPMID_1'],
  ['LP_UPMID_1'], ['LP_TOP_1', 'LP_TOP_2', 'LP_UPMID_2'], ['LP_TOP_1', 'LP_UPMID_1', 'LP_UPMID_2'],
];

describe('슬롯 X 0건 매트릭스 (정확도 100%)', () => {
  it.each(SLOT_SUBSETS.map((s, i) => [i, s] as const))('case %i: allowedSlots=%j', (_i, allowed) => {
    const r = run({
      orders: [{ itemId: 'P1', deliveryDate: '2026-05-22', quantity: 60 }],
      items: { P1: item('P1', { allowedSlots: allowed as string[] }) },
    });
    expect(r.schedules.every((s) => (allowed as string[]).includes(s.slot))).toBe(true);
  });
});

// 매트릭스: 다양한 납품일에서 D-2 보장 — 6 케이스
const DELIVERIES = ['2026-05-15', '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'];
describe('D-2 보장 매트릭스', () => {
  it.each(DELIVERIES)('납품 %s → 배치는 D-2 이내', (dd) => {
    const r = run({ orders: [{ itemId: 'P1', deliveryDate: dd, quantity: 20 }], items: { P1: item('P1') } });
    const di = WORKDAYS.indexOf(dd);
    const deadline = WORKDAYS[di - 2];
    expect(r.schedules.every((s) => s.date <= deadline)).toBe(true);
  });
});
