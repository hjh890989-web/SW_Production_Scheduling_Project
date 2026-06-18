import type { SourceType } from '@/lib/orders/types';

// 월예상(monthly_forecast) 파일명 키워드. '주간'·'kd'를 먼저 거른 뒤 매칭하므로
// 안전하다(예: '주간 계획'은 weekly로 선점). 예: '통합_수주정보…', '06월 … 예상 매출 계획…'.
const MONTHLY_KEYWORDS = ['통합', '수주정보', '예상', '매출'];

/** 파일명 패턴으로 수주 파일 종류 자동 감지 (T3.6). 미인식 시 null. */
export function detectSourceType(filename: string): SourceType | null {
  const n = filename.toLowerCase();
  if (n.includes('주간')) return 'weekly_plan';
  if (n.includes('kd')) return 'kd';
  if (MONTHLY_KEYWORDS.some((k) => n.includes(k))) return 'monthly_forecast';
  return null;
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB (AC SP-1-F2)
