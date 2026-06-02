import { z } from 'zod';
import type { MesResultRecord } from './types';

/**
 * T9.2 MES 실적 수신 — zod 검증 + ProductionResult 매핑 순수 함수.
 * 외부 호출 없이 입력 정규화·멱등 dedup만 담당(부수효과는 route에서).
 */

export const mesResultSchema = z.object({
  externalId: z.string().min(1),
  equipmentCode: z.string().min(1).optional(),
  productCode: z.string().min(1),
  process: z.enum(['MOLDING', 'EXTRUSION']),
  quantity: z.number().int().positive(),
  producedAt: z.string().datetime(),
});

export const mesResultBatchSchema = z.object({
  results: z.array(mesResultSchema).min(1),
});

export type MesResultPayload = z.infer<typeof mesResultSchema>;

/** API key 검증(상수시간 비교는 아님 — 사내망 + audit로 충분, CORE 결정). 빈 env면 항상 실패. */
export function checkApiKey(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  return provided === expected;
}

/** 같은 externalId 중복은 마지막 1건만 유지(멱등). */
export function dedupeByExternalId(records: MesResultPayload[]): MesResultPayload[] {
  const map = new Map<string, MesResultPayload>();
  for (const r of records) map.set(r.externalId, r);
  return [...map.values()];
}

/** 검증된 레코드 → ProductionResult create 데이터(itemId는 route에서 해소). */
export function toProductionResultData(record: MesResultPayload, itemId: string) {
  return {
    externalId: record.externalId,
    itemId,
    equipmentCode: record.equipmentCode ?? null,
    process: record.process,
    quantity: record.quantity,
    producedAt: new Date(record.producedAt),
  };
}

export type { MesResultRecord };
