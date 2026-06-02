import { describe, it, expect } from 'vitest';
import { egroupColor, egroupLabel, EGROUP_LEGEND } from './egroup-color';

describe('egroup-color (T6.3)', () => {
  it('E1~E8 distinct 색상', () => {
    const classes = Array.from({ length: 8 }, (_, i) => egroupColor(i + 1));
    expect(new Set(classes).size).toBe(8);
  });

  it('AC T6.3-F1: 미정의 그룹 → 회색 + 그룹 미정', () => {
    expect(egroupColor(null)).toContain('gray');
    expect(egroupColor(99)).toContain('gray');
    expect(egroupLabel(null)).toBe('그룹 미정');
  });

  it('라벨 E{n}', () => {
    expect(egroupLabel(3)).toBe('E3');
  });

  it('범례 9종(8 + 미정)', () => {
    expect(EGROUP_LEGEND).toHaveLength(9);
  });
});
