import { describe, it, expect } from 'vitest';
import { parseColumnMapping, DEFAULT_MAPPING_RULES } from './mapping-defaults';
import { SOURCE_TYPES } from './types';

describe('mapping defaults (T3.7)', () => {
  it('3 sourceType 기본 룰 존재', () => {
    for (const st of SOURCE_TYPES) {
      expect(DEFAULT_MAPPING_RULES[st].columnMapping.productCode).toBeTypeOf('number');
    }
  });

  it('parseColumnMapping: 정상 Json', () => {
    const r = parseColumnMapping('{"productCode":8,"material":0}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.productCode).toBe(8);
  });

  it('AC T3.7-F1: 잘못된 Json → 실패', () => {
    expect(parseColumnMapping('{not json').ok).toBe(false);
  });

  it('AC T3.7-F1: 숫자 아닌 값 → 실패', () => {
    expect(parseColumnMapping('{"productCode":"x"}').ok).toBe(false);
    expect(parseColumnMapping('{"productCode":-1}').ok).toBe(false);
  });
});
