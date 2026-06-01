import type { Confidence, OrderType, SourceType } from '@/lib/orders/types';

/** sourceType 우선순위 (낮을수록 우선). weekly_plan > kd > monthly_forecast (AC T3.5-F1). */
const SOURCE_PRIORITY: Record<SourceType, number> = {
  weekly_plan: 0,
  kd: 1,
  monthly_forecast: 2,
};

export interface PriorityInput {
  itemId?: string;
  rawProductCode: string;
  deliveryDate: string; // YYYY-MM-DD
  quantity: number;
  sourceType: SourceType;
  confidence: Confidence;
  orderType: OrderType;
}

export interface PrioritizedRow extends PriorityInput {
  status: 'ACTIVE' | 'SUPERSEDED';
}

/**
 * 3종 파일 수주 통합 우선순위 (T3.5 — R-5, 부록 F.6).
 * 품번 단위로 그룹:
 *  - weekly_plan(주간 확정)이 있으면 그것이 truth → weekly만 ACTIVE, 나머지 SUPERSEDED (AC T3.5-1).
 *  - weekly가 없으면 가장 빠른 납기 1건 ACTIVE, 동일 납기는 sourceType 우선순위로 deterministic 결정 (AC T3.5-2/F1).
 * (CORE-3 정책. KD 트랙은 orderType='KD'로 보존되어 식별 가능.)
 */
export function applyPriorityRule(rows: PriorityInput[]): PrioritizedRow[] {
  const groups = new Map<string, PriorityInput[]>();
  for (const r of rows) {
    const key = r.itemId ?? r.rawProductCode;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }

  const out: PrioritizedRow[] = [];
  for (const grp of groups.values()) {
    const hasWeekly = grp.some((r) => r.sourceType === 'weekly_plan');
    if (hasWeekly) {
      for (const r of grp) {
        out.push({ ...r, status: r.sourceType === 'weekly_plan' ? 'ACTIVE' : 'SUPERSEDED' });
      }
    } else {
      const sorted = [...grp].sort((a, b) => {
        if (a.deliveryDate !== b.deliveryDate) return a.deliveryDate < b.deliveryDate ? -1 : 1;
        return SOURCE_PRIORITY[a.sourceType] - SOURCE_PRIORITY[b.sourceType];
      });
      sorted.forEach((r, i) => out.push({ ...r, status: i === 0 ? 'ACTIVE' : 'SUPERSEDED' }));
    }
  }
  return out;
}
