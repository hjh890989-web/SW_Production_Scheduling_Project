import { describe, it, expect, vi, beforeEach } from 'vitest';

const findItemByCodeOrAlias = vi.fn();
vi.mock('@/lib/etl/normalizer', () => ({
  findItemByCodeOrAlias: (...a: unknown[]) => findItemByCodeOrAlias(...a),
}));

import { applySiliconeFilter, unmatchedCodes } from './silicone-filter';
import type { ParsedOrderRow } from './types';

function r(code: string): ParsedOrderRow {
  return { rawProductCode: code, deliveryDate: '2026-02-02', quantity: 10, sourceType: 'kd', confidence: 'CONFIRMED', orderType: 'KD' };
}

describe('applySiliconeFilter (T3.4)', () => {
  beforeEach(() => findItemByCodeOrAlias.mockReset());

  it('AC T3.4-1: 실리콘 passed / 타재료 rejected / 미매칭 unmatched 분류', async () => {
    findItemByCodeOrAlias.mockImplementation(async (code: string) => {
      if (code === 'SIL') return { id: 'i1', material: 'silicone' };
      if (code === 'EPD') return { id: 'i2', material: 'epdm' };
      return null;
    });
    const res = await applySiliconeFilter([r('SIL'), r('EPD'), r('NONE')]);
    expect(res.passed).toHaveLength(1);
    expect(res.passed[0].itemId).toBe('i1');
    expect(res.rejected).toHaveLength(1);
    expect(res.unmatched).toHaveLength(1);
  });

  it('AC T3.4-2: alias 매칭(normalizer가 해석)', async () => {
    findItemByCodeOrAlias.mockResolvedValue({ id: 'i9', material: 'silicone' });
    const res = await applySiliconeFilter([r('25474-2S010')]);
    expect(res.passed[0].itemId).toBe('i9');
  });

  it('AC T3.4-F1: 마스터 비어있음(전부 null) → 모두 unmatched', async () => {
    findItemByCodeOrAlias.mockResolvedValue(null);
    const res = await applySiliconeFilter([r('A'), r('B'), r('A')]);
    expect(res.unmatched).toHaveLength(3);
    expect(res.passed).toHaveLength(0);
    expect(unmatchedCodes(res)).toEqual(['A', 'B']); // 고유
  });
});
