import { describe, it, expect } from 'vitest';
import { validateParamValue, PARAM_BY_KEY } from '../../lib/master/operation-params';

describe('validateParamValue (T2.7)', () => {
  const eff = PARAM_BY_KEY.extrusion_efficiency; // 0~1
  const rot = PARAM_BY_KEY.lp_rotation_day; // 0~24

  it('AC T2.7-1: 정상 범위 값 통과', () => {
    expect(validateParamValue(rot, '10')).toEqual({ ok: true, value: 10 });
  });

  it('AC T2.7-2: 음수 → 거부 (확인 불가)', () => {
    const r = validateParamValue(rot, '-1');
    expect(r.ok).toBe(false);
    expect(r.needsConfirm).toBeUndefined();
  });

  it('AC T2.7-F1: efficiency 1.5(>max) → needsConfirm', () => {
    const r = validateParamValue(eff, '1.5');
    expect(r.ok).toBe(false);
    expect(r.needsConfirm).toBe(true);
    expect(r.value).toBe(1.5);
  });

  it('비숫자 → 거부', () => {
    expect(validateParamValue(rot, 'abc').ok).toBe(false);
    expect(validateParamValue(rot, '').ok).toBe(false);
  });
});
