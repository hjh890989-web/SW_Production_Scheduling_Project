import { describe, it, expect } from 'vitest';
import { normalizeMaterial, isValidMaterial, MATERIALS, MATERIAL_LABEL } from './material';

describe('normalizeMaterial (T12.6.1)', () => {
  it('표기 흔들림을 표준 코드로', () => {
    expect(normalizeMaterial('실리콘')).toBe('silicone');
    expect(normalizeMaterial('SILICONE')).toBe('silicone');
    expect(normalizeMaterial('epdm')).toBe('EPDM');
    expect(normalizeMaterial('Nitrile')).toBe('NBR');
    expect(normalizeMaterial(' nbr ')).toBe('NBR');
  });

  it('미상/빈값은 기본 silicone(기존 무결성 유지)', () => {
    expect(normalizeMaterial(null)).toBe('silicone');
    expect(normalizeMaterial('')).toBe('silicone');
    expect(normalizeMaterial('unknown')).toBe('silicone');
  });
});

describe('isValidMaterial / 메타 (T12.6.1)', () => {
  it('표준 코드만 유효', () => {
    expect(isValidMaterial('EPDM')).toBe(true);
    expect(isValidMaterial('실리콘')).toBe(false);
    expect(isValidMaterial(123)).toBe(false);
  });

  it('3종 자재 + 라벨', () => {
    expect(MATERIALS).toEqual(['silicone', 'EPDM', 'NBR']);
    expect(MATERIAL_LABEL.silicone).toBe('실리콘');
  });
});
