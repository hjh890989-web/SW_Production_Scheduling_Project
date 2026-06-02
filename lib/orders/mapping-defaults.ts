import { z } from 'zod';
import type { SourceType } from '@/lib/orders/types';

export interface MappingRule {
  sourceType: SourceType;
  sheetName: string | null;
  headerRow: number; // 1-indexed
  dataStartRow: number; // 1-indexed
  columnMapping: Record<string, number>;
}

/** 파서가 사용하는 현재 컬럼 매핑의 기본값(T3.1~T3.3과 일치). */
export const DEFAULT_MAPPING_RULES: Record<SourceType, MappingRule> = {
  weekly_plan: {
    sourceType: 'weekly_plan',
    sheetName: null,
    headerRow: 2,
    dataStartRow: 4,
    columnMapping: { material: 0, deliveryType: 1, productCode: 8 },
  },
  kd: {
    sourceType: 'kd',
    sheetName: 'kd 발주',
    headerRow: 5,
    dataStartRow: 6,
    columnMapping: { productCode: 2, dateChanged: 4, quantity: 6, dateOriginal: 10 },
  },
  monthly_forecast: {
    sourceType: 'monthly_forecast',
    sheetName: '통합 수주정보',
    headerRow: 4,
    dataStartRow: 5,
    columnMapping: { material: 1, deliveryType: 2, productCode: 9, source: 24 },
  },
};

/** columnMapping Json 검증 (AC T3.7-F1): 키→0 이상 정수. */
export const columnMappingSchema = z.record(z.string().min(1), z.number().int().min(0));

export const mappingRuleSchema = z.object({
  sheetName: z.string().nullable(),
  headerRow: z.number().int().min(1),
  dataStartRow: z.number().int().min(1),
  columnMapping: columnMappingSchema,
});

/** 문자열 Json → 검증된 columnMapping. 실패 시 { ok:false, error }. */
export function parseColumnMapping(
  json: string,
): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'JSON 형식이 올바르지 않습니다.' };
  }
  const parsed = columnMappingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: '컬럼 매핑은 {"필드":열번호} 형식의 0 이상 정수여야 합니다.' };
  }
  return { ok: true, value: parsed.data };
}
