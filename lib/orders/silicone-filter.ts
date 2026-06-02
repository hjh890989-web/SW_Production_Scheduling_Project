import { findItemByCodeOrAlias } from '@/lib/etl/normalizer';
import type { ParsedOrderRow } from '@/lib/orders/types';

export interface MatchedOrderRow extends ParsedOrderRow {
  itemId: string;
}

export interface SiliconeFilterResult {
  passed: MatchedOrderRow[]; // 매칭 + 실리콘
  rejected: ParsedOrderRow[]; // 매칭 + 다른 재료 (조용히 제외)
  unmatched: ParsedOrderRow[]; // 미매칭 (사용자 검토 큐)
}

/**
 * 실리콘 자동 필터 (T3.4 — D16 옵션 A). T2.9 normalizer로 품번/별칭 매칭.
 * - 매칭 + material='silicone' → passed
 * - 매칭 + 다른 재료 → rejected (조용히)
 * - 미매칭 → unmatched (알림 대상)
 * 마스터가 비어 있으면 모두 unmatched가 된다(AC T3.4-F1).
 */
export async function applySiliconeFilter(rows: ParsedOrderRow[]): Promise<SiliconeFilterResult> {
  const passed: MatchedOrderRow[] = [];
  const rejected: ParsedOrderRow[] = [];
  const unmatched: ParsedOrderRow[] = [];

  for (const row of rows) {
    const item = await findItemByCodeOrAlias(row.rawProductCode);
    if (!item) {
      unmatched.push(row);
    } else if (item.material === 'silicone') {
      passed.push({ ...row, itemId: item.id });
    } else {
      rejected.push(row);
    }
  }

  return { passed, rejected, unmatched };
}

/** 고유 미매칭 품번 목록. */
export function unmatchedCodes(result: SiliconeFilterResult): string[] {
  return [...new Set(result.unmatched.map((u) => u.rawProductCode))];
}
