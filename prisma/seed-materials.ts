import type { PrismaClient } from '@prisma/client';
import { buildMaterialSeedItems } from '../lib/material/seed-items';

/**
 * T12.6.2 EPDM·NBR 표본 품번 시드 (멱등 upsert, productCode 기준). 개발 환경 한정.
 */
export async function seedMaterialItems(prisma: PrismaClient): Promise<number> {
  const items = buildMaterialSeedItems();
  for (const it of items) {
    await prisma.item.upsert({
      where: { productCode: it.productCode },
      update: { material: it.material, customerCode: it.customerCode },
      create: { productCode: it.productCode, material: it.material, customerCode: it.customerCode },
    });
  }
  return items.length;
}
