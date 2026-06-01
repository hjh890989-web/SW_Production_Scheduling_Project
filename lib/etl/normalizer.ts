import { prisma } from '@/lib/db';

/**
 * 품번 정규화 (T2.9, CORE-2).
 * 모든 비영숫자 문자(공백·하이픈·슬래시 등) 제거 후 소문자화 → 표기 변형을 단일 키로 통일.
 * 예: "A 672 203 17 02" → "a6722031702", "25474-2S010" → "254742s010".
 */
export function normalizeProductCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * 품번 또는 별칭으로 Item 조회 (T2.9).
 * ① 정확한 productCode → ② ItemAlias.normalized → ③ Item.productCode 정규화 비교.
 */
export async function findItemByCodeOrAlias(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const exact = await prisma.item.findUnique({ where: { productCode: trimmed } });
  if (exact) return exact;

  const normalized = normalizeProductCode(trimmed);
  if (!normalized) return null;

  const aliasHit = await prisma.itemAlias.findFirst({
    where: { normalized },
    include: { item: true },
  });
  if (aliasHit) return aliasHit.item;

  // productCode를 정규화해 비교 (저장된 normalized 컬럼이 없으므로 후보 스캔)
  const candidates = await prisma.item.findMany({ select: { id: true, productCode: true } });
  const match = candidates.find((c) => normalizeProductCode(c.productCode) === normalized);
  return match ? prisma.item.findUnique({ where: { id: match.id } }) : null;
}

/**
 * 신규 별칭 등록 (T2.9, AC SP-1-2). 정규화 키를 함께 저장. 멱등(중복 alias는 무시).
 */
export async function addAlias(itemId: string, alias: string) {
  const trimmed = alias.trim();
  const normalized = normalizeProductCode(trimmed);
  return prisma.itemAlias.upsert({
    where: { alias: trimmed },
    update: { itemId, normalized },
    create: { itemId, alias: trimmed, normalized },
  });
}
