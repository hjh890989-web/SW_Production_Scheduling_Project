/**
 * 영향 셀 하이라이트 좌표 (T7.4 — AC PM-1-2). 순수 함수.
 * 그리드 셀 중 대상 품번에 해당하는 셀의 `${rowKey}|${colKey}` 키를 반환.
 */
export interface CellRef {
  productCode: string;
  rowKey: string;
  colKey: string;
}

export function matchedCellKeys(cells: CellRef[], productCode: string): string[] {
  if (!productCode) return [];
  return cells.filter((c) => c.productCode === productCode).map((c) => `${c.rowKey}|${c.colKey}`);
}

export const HIGHLIGHT_MAX = 50;

export interface HighlightSummary {
  total: number;
  shown: number;
  truncated: boolean; // >max → 요약 표시 (AC T7.4-F1)
}

export function highlightSummary(total: number, max: number = HIGHLIGHT_MAX): HighlightSummary {
  return { total, shown: Math.min(total, max), truncated: total > max };
}
