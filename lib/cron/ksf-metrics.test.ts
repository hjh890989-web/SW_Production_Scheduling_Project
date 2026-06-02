import { describe, it, expect } from 'vitest';
import { computePunctuality, computeUnificationRate, computeAdoptionRate } from './ksf-metrics';

describe('KSF 지표 산출 (T4.4)', () => {
  it('KSF-5 일원화율 = ACTIVE/(ACTIVE+SUPERSEDED)', () => {
    const orders = [{ status: 'ACTIVE' }, { status: 'ACTIVE' }, { status: 'SUPERSEDED' }, { status: 'CANCELLED' }];
    expect(computeUnificationRate(orders)).toBeCloseTo(2 / 3);
  });

  it('데이터 없으면 null (AC: 미산출)', () => {
    expect(computeUnificationRate([])).toBeNull();
    expect(computePunctuality([])).toBeNull();
    expect(computeAdoptionRate([])).toBeNull();
  });

  it('KSF-1 납기율', () => {
    expect(computePunctuality([{ onTime: true }, { onTime: false }])).toBe(0.5);
  });

  it('KSF-6 채택률', () => {
    expect(computeAdoptionRate([{ adopted: true }, { adopted: true }, { adopted: false }])).toBeCloseTo(2 / 3);
  });
});
