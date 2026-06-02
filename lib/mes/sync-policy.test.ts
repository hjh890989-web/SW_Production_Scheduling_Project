import { describe, it, expect } from 'vitest';
import {
  nextStreak,
  shouldAlert,
  computeSince,
  pickDueRetries,
  POLL_CRON,
  SYNC_LOOKBACK_MS,
} from './sync-policy';

describe('연속 실패 알림 (T9.5, AC T9.5-F1)', () => {
  it('성공이면 streak 0, 실패면 누적', () => {
    expect(nextStreak(3, true)).toBe(0);
    expect(nextStreak(0, false)).toBe(1);
    expect(nextStreak(1, false)).toBe(2);
  });

  it('임계(기본 1) 이상이면 알림', () => {
    expect(shouldAlert(0)).toBe(false);
    expect(shouldAlert(1)).toBe(true);
    expect(shouldAlert(3, 3)).toBe(true);
  });

  it('POLL_CRON은 5분 주기', () => {
    expect(POLL_CRON).toBe('*/5 * * * *');
  });
});

describe('computeSince (T9.5)', () => {
  it('마지막 동기화 시각 사용, 없으면 lookback 전', () => {
    const now = new Date('2026-06-01T01:00:00.000Z');
    expect(computeSince(new Date('2026-06-01T00:30:00.000Z'), now)).toBe('2026-06-01T00:30:00.000Z');
    expect(computeSince(null, now)).toBe(new Date(now.getTime() - SYNC_LOOKBACK_MS).toISOString());
  });
});

describe('pickDueRetries (T9.5)', () => {
  it('PENDING + 도래 항목만', () => {
    const now = new Date('2026-06-01T01:00:00.000Z');
    const items = [
      { status: 'PENDING', nextRetryAt: new Date('2026-06-01T00:55:00.000Z') }, // due
      { status: 'PENDING', nextRetryAt: new Date('2026-06-01T01:05:00.000Z') }, // 미도래
      { status: 'SENT', nextRetryAt: new Date('2026-06-01T00:00:00.000Z') }, // 제외
    ];
    expect(pickDueRetries(items, now)).toHaveLength(1);
  });
});
