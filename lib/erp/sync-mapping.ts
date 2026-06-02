import type { ErpItemRecord } from './types';

/**
 * T10.2 ERP→Item 마스터 동기화 매핑 — 순수 함수. 변경분만 upsert(불필요 쓰기 방지).
 */

export interface ExistingItem {
  customerCode: string | null;
  hwasungCode: string | null;
  material: string;
}

/** API key 비교(빈 env면 항상 실패). */
export function erpApiKeyOk(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  return provided === expected;
}

/** 신규 Item 생성 데이터. material 미제공 시 기본 silicone. */
export function toCreateData(erp: ErpItemRecord) {
  return {
    productCode: erp.productCode,
    customerCode: erp.customerCode ?? null,
    hwasungCode: erp.hwasungCode ?? null,
    material: erp.material ?? 'silicone',
  };
}

/**
 * 기존 Item과 ERP 레코드 비교 → 변경된 필드만 반환. 변경 없으면 null(쓰기 생략).
 */
export function computeItemChanges(existing: ExistingItem, erp: ErpItemRecord): Record<string, unknown> | null {
  const changes: Record<string, unknown> = {};
  const nextCustomer = erp.customerCode ?? null;
  const nextHwasung = erp.hwasungCode ?? null;
  if (nextCustomer !== existing.customerCode) changes.customerCode = nextCustomer;
  if (nextHwasung !== existing.hwasungCode) changes.hwasungCode = nextHwasung;
  if (erp.material && erp.material !== existing.material) changes.material = erp.material;
  return Object.keys(changes).length > 0 ? changes : null;
}

export interface SyncSummary {
  created: number;
  updated: number;
  unchanged: number;
  total: number;
}

export function summarize(s: Omit<SyncSummary, 'total'>): SyncSummary {
  return { ...s, total: s.created + s.updated + s.unchanged };
}
