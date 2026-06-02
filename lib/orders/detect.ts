import type { SourceType } from '@/lib/orders/types';

/** 파일명 패턴으로 수주 파일 종류 자동 감지 (T3.6). 미인식 시 null. */
export function detectSourceType(filename: string): SourceType | null {
  const n = filename.toLowerCase();
  if (n.includes('주간')) return 'weekly_plan';
  if (n.includes('kd')) return 'kd';
  if (n.includes('통합') || n.includes('수주정보')) return 'monthly_forecast';
  return null;
}

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB (AC SP-1-F2)
