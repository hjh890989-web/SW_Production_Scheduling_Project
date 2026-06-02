import { describe, it, expect } from 'vitest';
import { buildMaterialSeedItems } from './seed-items';

describe('buildMaterialSeedItems (T12.6.2)', () => {
  const items = buildMaterialSeedItems();

  it('EPDM·NBR 표본을 정규화된 자재로 생성', () => {
    const materials = new Set(items.map((i) => i.material));
    expect(materials).toEqual(new Set(['EPDM', 'NBR']));
    expect(items).toHaveLength(4);
  });

  it('productCode 고유, 모두 표준 자재 코드', () => {
    const codes = items.map((i) => i.productCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(items.every((i) => i.material === 'EPDM' || i.material === 'NBR')).toBe(true);
  });
});
