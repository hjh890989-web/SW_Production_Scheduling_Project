import type { PrismaClient } from '@prisma/client';
import {
  LP_SLOTS,
  IC_SLOTS,
  assertValidSlot,
  type EquipmentType,
} from '../lib/master/equipment';

/** 장비 시드 정의 (T2.2 — 저압 4 + IC 1 + 압출 2 = 7대). */
export interface SeedEquipment {
  code: string;
  name: string;
  type: EquipmentType;
  capacity: { slots?: string[]; lines?: string[] };
}

export const SEED_EQUIPMENT: SeedEquipment[] = [
  { code: 'LP_1', name: '저압가류기 1호', type: 'MOLDING_LP', capacity: { slots: [...LP_SLOTS] } },
  { code: 'LP_2', name: '저압가류기 2호', type: 'MOLDING_LP', capacity: { slots: [...LP_SLOTS] } },
  { code: 'LP_3', name: '저압가류기 3호', type: 'MOLDING_LP', capacity: { slots: [...LP_SLOTS] } },
  { code: 'LP_4', name: '저압가류기 4호', type: 'MOLDING_LP', capacity: { slots: [...LP_SLOTS] } },
  { code: 'IC_1', name: 'IC가류기 1호', type: 'MOLDING_IC', capacity: { slots: [...IC_SLOTS] } },
  { code: 'FORD', name: '압출기 포드(FORD)', type: 'EXTRUSION', capacity: { lines: ['FORD'] } },
  { code: 'NEW', name: '압출기 뉴(NEW)', type: 'EXTRUSION', capacity: { lines: ['NEW'] } },
];

/** Equipment 멱등 upsert. 슬롯은 검증 후 적재 (AC T2.2-F1). 반환: 적재 건수. */
export async function seedEquipment(prisma: PrismaClient): Promise<number> {
  for (const eq of SEED_EQUIPMENT) {
    (eq.capacity.slots ?? []).forEach(assertValidSlot);
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: { name: eq.name, type: eq.type, capacity: eq.capacity },
      create: { code: eq.code, name: eq.name, type: eq.type, capacity: eq.capacity },
    });
  }
  return SEED_EQUIPMENT.length;
}
