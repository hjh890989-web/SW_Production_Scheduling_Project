import { describe, it, expect } from 'vitest';
import { ksfPercent, ksfTrend, TREND_MARK } from './format';

describe('ksfPercent (T12.5.2)', () => {
  it('비율 → %', () => {
    expect(ksfPercent(0.95)).toBe('95%');
    expect(ksfPercent(1)).toBe('100%');
  });
  it('null/undefined → —', () => {
    expect(ksfPercent(null)).toBe('—');
    expect(ksfPercent(undefined)).toBe('—');
  });
});

describe('ksfTrend (T12.5.2)', () => {
  it('증가/감소/동일', () => {
    expect(ksfTrend(0.9, 0.8)).toBe('up');
    expect(ksfTrend(0.7, 0.8)).toBe('down');
    expect(ksfTrend(0.8, 0.8)).toBe('flat');
  });
  it('값 부족 → none', () => {
    expect(ksfTrend(0.9, null)).toBe('none');
    expect(ksfTrend(null, 0.8)).toBe('none');
  });
  it('추세 마크', () => {
    expect(TREND_MARK.up).toBe('▲');
    expect(TREND_MARK.none).toBe('');
  });
});
