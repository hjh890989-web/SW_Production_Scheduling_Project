import { describe, it, expect } from 'vitest';
import { matchedCellKeys, highlightSummary } from './highlight';

const cells = [
  { productCode: 'P1', rowKey: 'LP_1_LP_TOP_1', colKey: '2026-05-20_DAY' },
  { productCode: 'P1', rowKey: 'LP_1_LP_TOP_2', colKey: '2026-05-20_DAY' },
  { productCode: 'P2', rowKey: 'IC_1_IC_TOP_1', colKey: '2026-05-20_DAY' },
];

describe('impact highlight (T7.4)', () => {
  it('AC T7.4-1: 대상 품번 셀 키만 반환', () => {
    expect(matchedCellKeys(cells, 'P1')).toEqual(['LP_1_LP_TOP_1|2026-05-20_DAY', 'LP_1_LP_TOP_2|2026-05-20_DAY']);
  });
  it('빈 품번 → 빈 배열', () => {
    expect(matchedCellKeys(cells, '')).toEqual([]);
  });
  it('AC T7.4-F1: >50건 → truncated 요약', () => {
    expect(highlightSummary(60)).toMatchObject({ total: 60, shown: 50, truncated: true });
    expect(highlightSummary(10).truncated).toBe(false);
  });
});
