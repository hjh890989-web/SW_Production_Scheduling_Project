import { describe, it, expect } from 'vitest';
import {
  mesResultSchema,
  mesResultBatchSchema,
  checkApiKey,
  dedupeByExternalId,
  toProductionResultData,
  type MesResultPayload,
} from './result-mapping';

const valid: MesResultPayload = {
  externalId: 'MES-001',
  equipmentCode: 'LP-01',
  productCode: 'P1',
  process: 'MOLDING',
  quantity: 100,
  producedAt: '2026-06-01T08:00:00.000Z',
};

describe('mesResultSchema (T9.2)', () => {
  it('정상 레코드 통과', () => {
    expect(mesResultSchema.parse(valid).externalId).toBe('MES-001');
  });

  it('잘못된 process·음수 수량은 거부', () => {
    expect(mesResultSchema.safeParse({ ...valid, process: 'X' }).success).toBe(false);
    expect(mesResultSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false);
  });

  it('batch는 최소 1건', () => {
    expect(mesResultBatchSchema.safeParse({ results: [] }).success).toBe(false);
    expect(mesResultBatchSchema.safeParse({ results: [valid] }).success).toBe(true);
  });
});

describe('checkApiKey (T9.2, AC T9.2-F1)', () => {
  it('일치 시 true, 불일치/빈 env는 false', () => {
    expect(checkApiKey('secret', 'secret')).toBe(true);
    expect(checkApiKey('wrong', 'secret')).toBe(false);
    expect(checkApiKey('secret', undefined)).toBe(false);
    expect(checkApiKey(null, 'secret')).toBe(false);
  });
});

describe('dedupeByExternalId / toProductionResultData (T9.2)', () => {
  it('같은 externalId 중복은 마지막 1건', () => {
    const out = dedupeByExternalId([valid, { ...valid, quantity: 50 }]);
    expect(out).toHaveLength(1);
    expect(out[0].quantity).toBe(50);
  });

  it('매핑은 itemId 주입 + producedAt Date 변환', () => {
    const data = toProductionResultData(valid, 'item-1');
    expect(data.itemId).toBe('item-1');
    expect(data.producedAt).toBeInstanceOf(Date);
    expect(data.equipmentCode).toBe('LP-01');
  });
});
