import { describe, it, expect } from 'vitest';
import { aggregateKsfByMaterial } from './ksf-by-material';

describe('aggregateKsfByMaterial (T12.6.4)', () => {
  it('자재별 납기율 집계 + MATERIALS 순서 정렬', () => {
    const out = aggregateKsfByMaterial([
      { material: 'EPDM', onTime: true },
      { material: 'silicone', onTime: true },
      { material: 'silicone', onTime: false },
      { material: 'EPDM', onTime: true },
      { material: 'NBR', onTime: false },
    ]);
    expect(out.map((r) => r.material)).toEqual(['silicone', 'EPDM', 'NBR']);
    expect(out[0]).toEqual({ material: 'silicone', total: 2, onTime: 1, punctuality: 0.5 });
    expect(out[1].punctuality).toBe(1); // EPDM 2/2
    expect(out[2].punctuality).toBe(0); // NBR 0/1
  });

  it('빈 입력은 빈 배열', () => {
    expect(aggregateKsfByMaterial([])).toEqual([]);
  });
});
