import { z } from 'zod';
import { createHash, timingSafeEqual } from 'crypto';
import type { MesResultRecord } from './types';

/**
 * T9.2 MES 실적 수신 — zod 검증 + ProductionResult 매핑 순수 함수.
 * 외부 호출 없이 입력 정규화·멱등 dedup만 담당(부수효과는 route에서).
 */

/** PostgreSQL Int4 상한 — 수량 overflow 방지(SEC). */
export const MAX_QUANTITY = 2_147_483_647;
/** 단일 배치 최대 레코드 수 — DoS(메모리/이벤트루프 점유) 방지(SEC). */
export const MAX_BATCH = 1000;

export const mesResultSchema = z.object({
  externalId: z.string().min(1).max(200),
  equipmentCode: z.string().min(1).max(100).optional(),
  productCode: z.string().min(1).max(100),
  process: z.enum(['MOLDING', 'EXTRUSION']),
  quantity: z.number().int().positive().max(MAX_QUANTITY),
  producedAt: z.string().datetime(),
});

export const mesResultBatchSchema = z.object({
  results: z.array(mesResultSchema).min(1).max(MAX_BATCH),
});

export type MesResultPayload = z.infer<typeof mesResultSchema>;

/**
 * API key 상수시간 비교(SEC: 타이밍 사이드채널 방지). 빈 env/미제공이면 항상 실패.
 * sha256 다이제스트를 timingSafeEqual로 비교 — 길이 노출 없이 상수시간.
 */
export function checkApiKey(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
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
