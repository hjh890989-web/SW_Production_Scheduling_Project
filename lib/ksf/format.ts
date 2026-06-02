/**
 * T12.5.2 모바일 KSF 표시 포맷 — 순수 함수. 비율(0~1)·추세 표기.
 */

export type Trend = 'up' | 'down' | 'flat' | 'none';

/** 0~1 비율 → 정수 % 문자열. null은 '—'. */
export function ksfPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

/** 현재값과 직전값 비교 추세. 한쪽이라도 없으면 'none'. */
export function ksfTrend(current: number | null | undefined, prev: number | null | undefined): Trend {
  if (current === null || current === undefined || prev === null || prev === undefined) return 'none';
  if (current > prev) return 'up';
  if (current < prev) return 'down';
  return 'flat';
}

export const TREND_MARK: Record<Trend, string> = { up: '▲', down: '▼', flat: '—', none: '' };
