import { describe, it, expect } from 'vitest';
import { buildExtColumns, buildExtRows, buildExtCells, buildExtGrid } from './grid';

describe('extrusion grid 어댑터 (T6.2)', () => {
  it('영업일 → 일자 열(1일 1열)', () => {
    const cols = buildExtColumns([{ date: '2026-05-18', isWorkday: true }, { date: '2026-05-19', isWorkday: true }]);
    expect(cols).toHaveLength(2);
    expect(cols[0].key).toBe('2026-05-18');
  });

  it('압출기 × 근무4 → 행', () => {
    const rows = buildExtRows([{ code: 'FORD', name: '포드' }, { code: 'NEW', name: '뉴' }]);
    expect(rows).toHaveLength(8);
    expect(rows[0].key).toBe('FORD_DAY_FIRST');
  });

  it('엔트리 → 셀 키 매핑', () => {
    const cells = buildExtCells([
      { date: '2026-05-18', shift: 'DAY_FIRST', extruderCode: 'FORD', itemId: 'i', productCode: 'P', quantity: 50, extrusionGroup: 1, headPin: '22*8', status: 'AUTO' },
    ]);
    expect(cells[0]).toMatchObject({ rowKey: 'FORD_DAY_FIRST', colKey: '2026-05-18', quantity: 50 });
  });

  it('buildExtGrid 통합', () => {
    const g = buildExtGrid([{ date: '2026-05-18', isWorkday: true }], [{ code: 'FORD', name: 'x' }], []);
    expect(g.columns).toHaveLength(1);
    expect(g.rows).toHaveLength(4);
  });
});
