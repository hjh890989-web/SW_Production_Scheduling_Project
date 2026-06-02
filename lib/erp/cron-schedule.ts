/**
 * T10.3 ERP cron 스케줄 상수·환산 — 순수(무의존). node-cron·서비스 import 없이 테스트 가능.
 */

export const ERP_SYNC_CRON = '0 18 * * *'; // 03:00 KST = 18:00 UTC

/** KST 시각 → UTC cron 표현식. node-cron은 서버 TZ 기준이라 UTC로 환산해 고정. */
export function kstHourToUtcCron(kstHour: number, minute = 0): string {
  const utcHour = (((kstHour - 9) % 24) + 24) % 24;
  return `${minute} ${utcHour} * * *`;
}
