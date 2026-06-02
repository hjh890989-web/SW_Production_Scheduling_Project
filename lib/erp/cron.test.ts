import { describe, it, expect } from 'vitest';
import { ERP_SYNC_CRON, kstHourToUtcCron } from './cron-schedule';

describe('ERP cron 스케줄 (T10.3, AC T10.3-1)', () => {
  it('03:00 KST = 18:00 UTC', () => {
    expect(ERP_SYNC_CRON).toBe('0 18 * * *');
    expect(kstHourToUtcCron(3)).toBe('0 18 * * *');
  });

  it('자정 KST → 15:00 UTC, 분 지정 가능', () => {
    expect(kstHourToUtcCron(0)).toBe('0 15 * * *');
    expect(kstHourToUtcCron(9)).toBe('0 0 * * *'); // 09 KST = 00 UTC
    expect(kstHourToUtcCron(3, 30)).toBe('30 18 * * *');
  });
});
