import { isDue } from './retry-policy';

/**
 * T9.5 폴링·재시도 정책 — 순수 함수. 5분 주기 동기화 + 연속 실패 알림(AC T9.5-1/F1).
 */

export const POLL_CRON = '*/5 * * * *'; // 5분 주기
export const SYNC_LOOKBACK_MS = 10 * 60 * 1000; // 마지막 동기화 미상 시 10분 조회
/** 5분 주기 1회 실패 = 5분 연속 실패(PRD §5.5.2). */
export const FAILURE_ALERT_THRESHOLD = 1;

/** 성공이면 streak 리셋, 실패면 +1. */
export function nextStreak(prevStreak: number, success: boolean): number {
  return success ? 0 : prevStreak + 1;
}

/** 연속 실패가 임계 이상이면 알림 발송. */
export function shouldAlert(streak: number, threshold: number = FAILURE_ALERT_THRESHOLD): boolean {
  return streak >= threshold;
}

/** fetchResults 조회 시작 시각(마지막 동기화 또는 lookback 전). */
export function computeSince(lastSyncAt: Date | null, now: Date, lookbackMs: number = SYNC_LOOKBACK_MS): string {
  const since = lastSyncAt ?? new Date(now.getTime() - lookbackMs);
  return since.toISOString();
}

export interface DueRetryItem {
  status: string;
  nextRetryAt: Date;
}

/** PENDING이며 재시도 시각이 도래한 항목만 추출. */
export function pickDueRetries<T extends DueRetryItem>(items: T[], now: Date): T[] {
  return items.filter((it) => it.status === 'PENDING' && isDue(it.nextRetryAt, now));
}
