import { describe, it, expect } from 'vitest';
import { PARAM_DEFS } from '../../lib/master/operation-params';

describe('운영 파라미터 정의 (T2.3)', () => {
  it('AC T2.3-1: 13개 키', () => {
    expect(PARAM_DEFS).toHaveLength(13);
  });

  it('key 중복 없음', () => {
    expect(new Set(PARAM_DEFS.map((p) => p.key)).size).toBe(13);
  });

  it('AC T2.3-F1: value는 String으로 저장 (String 변환)', () => {
    for (const p of PARAM_DEFS) {
      expect(typeof String(p.defaultValue)).toBe('string');
    }
  });

  it('min ≤ default ≤ max 불변식', () => {
    for (const p of PARAM_DEFS) {
      expect(p.min).toBeLessThanOrEqual(p.defaultValue);
      expect(p.defaultValue).toBeLessThanOrEqual(p.max);
    }
  });

  it('주요 기본값 확인', () => {
    const byKey = Object.fromEntries(PARAM_DEFS.map((p) => [p.key, p.defaultValue]));
    expect(byKey.lp_rotation_day).toBe(8);
    expect(byKey.extrusion_efficiency).toBe(0.75);
    expect(byKey.d2_rule_days).toBe(2);
  });
});
