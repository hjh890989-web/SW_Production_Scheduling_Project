import { describe, it, expect } from 'vitest';
import { ErpClientMock } from './ErpClientMock';
import { computeItemChanges, toCreateData, summarize, type ExistingItem } from './sync-mapping';
import type { ErpItemRecord } from './types';

/**
 * T10.4 ERP 통합 테스트 (정상·변경분·ERP 다운 + 마스터 변경 검증).
 * 실 영림원 미확정(TBD-2)이므로 ErpClientMock으로 시나리오 구동(외부 호출 없음).
 * DB 부수효과는 runErpSync(service)가 담당하고, 본 테스트는 fetch 결과 × 매핑 규칙 결합을 검증한다.
 */

/** runErpSync 루프와 동일 규칙으로 변경분 집계(메모리). */
function simulateSync(records: ErpItemRecord[], existing: Map<string, ExistingItem>) {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const r of records) {
    const cur = existing.get(r.productCode);
    if (!cur) {
      toCreateData(r); // 생성 데이터 구성 검증(throw 없음)
      created += 1;
    } else if (computeItemChanges(cur, r)) {
      updated += 1;
    } else {
      unchanged += 1;
    }
  }
  return summarize({ created, updated, unchanged });
}

describe('T10.4 시나리오: 정상 fetch', () => {
  it('Mock fetchItems는 시드 반환', async () => {
    const client = new ErpClientMock([{ productCode: 'P1', customerCode: 'C1' }]);
    expect((await client.fetchItems()).map((r) => r.productCode)).toEqual(['P1']);
  });
});

describe('T10.4 시나리오: 변경분 동기화(마스터 변경 검증)', () => {
  it('신규/변경/무변경을 정확히 분류', () => {
    const existing = new Map<string, ExistingItem>([
      ['P1', { customerCode: 'C1', hwasungCode: 'H1', material: 'silicone' }], // 무변경
      ['P2', { customerCode: 'C2', hwasungCode: 'H2', material: 'silicone' }], // 변경
    ]);
    const records: ErpItemRecord[] = [
      { productCode: 'P1', customerCode: 'C1', hwasungCode: 'H1', material: 'silicone' }, // 동일
      { productCode: 'P2', customerCode: 'C2-NEW', hwasungCode: 'H2', material: 'silicone' }, // customerCode 변경
      { productCode: 'P3', customerCode: 'C3' }, // 신규
    ];
    const summary = simulateSync(records, existing);
    expect(summary).toEqual({ created: 1, updated: 1, unchanged: 1, total: 3 });
  });

  it('material 변경도 updated로 집계', () => {
    const existing = new Map<string, ExistingItem>([['P1', { customerCode: null, hwasungCode: null, material: 'silicone' }]]);
    const summary = simulateSync([{ productCode: 'P1', material: 'EPDM' }], existing);
    expect(summary.updated).toBe(1);
  });
});

describe('T10.4 시나리오: ERP 다운', () => {
  it('fetchItems가 예외 → 동기화 실패 경로(audit+알림 대상)', async () => {
    await expect(new ErpClientMock([], true).fetchItems()).rejects.toThrow(/unreachable/);
  });
});
