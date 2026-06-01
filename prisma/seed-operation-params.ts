import type { PrismaClient } from '@prisma/client';
import { PARAM_DEFS } from '../lib/master/operation-params';

/** 운영 파라미터 초기값 시드 (T2.3). value는 String 변환 저장. 멱등 upsert. */
export async function seedOperationParams(prisma: PrismaClient): Promise<number> {
  for (const p of PARAM_DEFS) {
    const value = String(p.defaultValue); // AC T2.3-F1: 모든 value는 String
    await prisma.operationParam.upsert({
      where: { key: p.key },
      update: { category: p.category, label: p.label },
      create: { key: p.key, value, category: p.category, label: p.label },
    });
  }
  return PARAM_DEFS.length;
}
