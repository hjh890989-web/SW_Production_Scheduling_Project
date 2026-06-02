import { describe, it, expect } from 'vitest';
import { filterByMaterial, countByMaterial } from './filter';

const rows = [
  { id: 1, material: 'silicone' },
  { id: 2, material: 'EPDM' },
  { id: 3, material: 'EPDM' },
  { id: 4, material: 'NBR' },
];

describe('filterByMaterial (T12.6.3)', () => {
  it('ALL은 전체 반환', () => {
    expect(filterByMaterial(rows, 'ALL')).toHaveLength(4);
  });

  it('자재별 필터', () => {
    expect(filterByMaterial(rows, 'EPDM').map((r) => r.id)).toEqual([2, 3]);
    expect(filterByMaterial(rows, 'NBR')).toHaveLength(1);
  });
});

describe('countByMaterial (T12.6.3)', () => {
  it('자재별 건수 집계', () => {
    expect(countByMaterial(rows)).toEqual({ silicone: 1, EPDM: 2, NBR: 1 });
  });
});
