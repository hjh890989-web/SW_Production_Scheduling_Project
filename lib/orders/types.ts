/**
 * 수주 도메인 타입 (Sprint 3, CORE-1: enum류는 String union).
 */
export const SOURCE_TYPES = ['weekly_plan', 'kd', 'monthly_forecast'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONFIDENCE = ['CONFIRMED', 'FORECAST', 'MIXED'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const ORDER_TYPES = ['OEM', 'KD'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUS = ['ACTIVE', 'SUPERSEDED', 'CHANGED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

/** 파서가 생성하는 한 행(품번 매칭 전, 원본 품번 기준). */
export interface ParsedOrderRow {
  rawProductCode: string;
  deliveryDate: string; // YYYY-MM-DD
  quantity: number;
  sourceType: SourceType;
  confidence: Confidence;
  orderType: OrderType;
}

export interface ParseResult {
  rows: ParsedOrderRow[];
  errors: string[];
}
