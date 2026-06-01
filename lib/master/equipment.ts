/**
 * 장비·슬롯 정의 (T2.2, CORE-1: enum 대신 String union + 검증).
 */
export const EQUIPMENT_TYPES = ['MOLDING_LP', 'MOLDING_IC', 'EXTRUSION'] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

// 저압가류기 슬롯 8개 (상2/중상2/중하2/하2)
export const LP_SLOTS = [
  'LP_TOP_1', 'LP_TOP_2',
  'LP_UPMID_1', 'LP_UPMID_2',
  'LP_LOMID_1', 'LP_LOMID_2',
  'LP_BOT_1', 'LP_BOT_2',
] as const;

// IC가류기 슬롯 6개 (상2/중2/하2)
export const IC_SLOTS = [
  'IC_TOP_1', 'IC_TOP_2',
  'IC_MID_1', 'IC_MID_2',
  'IC_BOT_1', 'IC_BOT_2',
] as const;

export type SlotPosition = (typeof LP_SLOTS)[number] | (typeof IC_SLOTS)[number];

const VALID_SLOTS = new Set<string>([...LP_SLOTS, ...IC_SLOTS]);

export function isValidSlot(slot: string): slot is SlotPosition {
  return VALID_SLOTS.has(slot);
}

/** 미정의 SlotPosition이면 throw (AC T2.2-F1 — 앱 레벨 검증). */
export function assertValidSlot(slot: string): void {
  if (!isValidSlot(slot)) {
    throw new Error(`정의되지 않은 SlotPosition: ${slot}`);
  }
}
