import type { PrismaClient } from '@prisma/client';
import itemsData from './data/items.json';

/**
 * 47 실리콘 품번 시드 (T2.1). 데이터는 Raw Materials 엑셀에서 추출한 prisma/data/items.json.
 * (추출: `node prisma/extract-items.mjs`, CORE-3 참고)
 */
export interface SeedItem {
  productCode: string;
  material: string;
  extrusionGroup: number;
  headPin: string;
  cutLength: number | null;
  extrusionSpeed: number | null;
  extruderFord: boolean;
  extruderNew: boolean;
  lpMoldsPerAngle: number | null;
  icMoldsPerAngle: number | null;
  lpPosTop: boolean;
}

export const SEED_ITEMS = itemsData as SeedItem[];

/** Item 테이블에 멱등 upsert (AC T2.1-2). 반환: 적재 건수. */
export async function seedItems(prisma: PrismaClient): Promise<number> {
  for (const it of SEED_ITEMS) {
    await prisma.item.upsert({
      where: { productCode: it.productCode },
      update: { ...it },
      create: { ...it },
    });
  }
  return SEED_ITEMS.length;
}
