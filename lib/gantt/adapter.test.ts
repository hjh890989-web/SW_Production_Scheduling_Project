import { describe, it, expect } from 'vitest';
import { buildColumns, buildRows, buildCells, buildGrid } from './adapter';

describe('gantt adapter (T5.1)', () => {
  it('영업일 → 주/야 2열', () => {
    const cols = buildColumns([{ date: '2026-05-18', isWorkday: true }, { date: '2026-05-19', isWorkday: true }]);
    expect(cols).toHaveLength(4);
    expect(cols[0]).toMatchObject({ daynight: 'DAY', key: '2026-05-18_DAY' });
    expect(cols[1].daynight).toBe('NIGHT');
  });

  it('가류기 × 슬롯 → 행', () => {
    const rows = buildRows([{ code: 'LP_1', name: '저압1', slots: ['LP_TOP_1', 'LP_TOP_2'] }]);
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe('LP_1_LP_TOP_1');
  });

  it('엔트리 → 셀 키 매핑', () => {
    const cells = buildCells([
      { date: '2026-05-18', daynight: 'DAY', equipmentCode: 'LP_1', slot: 'LP_TOP_1', itemId: 'i1', productCode: 'P1', rotations: 8, status: 'AUTO' },
    ]);
    expect(cells[0]).toMatchObject({ rowKey: 'LP_1_LP_TOP_1', colKey: '2026-05-18_DAY', status: 'AUTO', ruleViolation: false });
  });

  it('buildGrid 통합', () => {
    const g = buildGrid([{ date: '2026-05-18', isWorkday: true }], [{ code: 'LP_1', name: 'x', slots: ['LP_TOP_1'] }], []);
    expect(g.columns).toHaveLength(2);
    expect(g.rows).toHaveLength(1);
    expect(g.cells).toHaveLength(0);
  });
});
