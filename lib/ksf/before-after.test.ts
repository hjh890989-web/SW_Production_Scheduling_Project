import { describe, it, expect } from 'vitest';
import { compareBeforeAfter } from './before-after';

describe('compareBeforeAfter (T12.5.3)', () => {
  it('개선/악화/동일 + deltaPct(%p)', () => {
    const out = compareBeforeAfter([
      { key: 'k1', label: '납기율', before: 0.8, after: 0.95 },
      { key: 'k2', label: '채택률', before: 0.6, after: 0.5 },
      { key: 'k3', label: '동일', before: 0.7, after: 0.7 },
    ]);
    expect(out[0].deltaPct).toBeCloseTo(15, 5);
    expect(out[0].improved).toBe(true);
    expect(out[1].improved).toBe(false);
    expect(out[2].improved).toBe(false);
    expect(out[2].deltaPct).toBe(0);
  });

  it('한쪽 null이면 deltaPct·improved null', () => {
    const out = compareBeforeAfter([{ key: 'k', label: 'x', before: null, after: 0.9 }]);
    expect(out[0].deltaPct).toBeNull();
    expect(out[0].improved).toBeNull();
  });
});
