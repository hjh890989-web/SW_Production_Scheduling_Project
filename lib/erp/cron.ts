import cron from 'node-cron';
import { runErpSync } from './sync-service';
import { ERP_SYNC_CRON } from './cron-schedule';
import { registerKsfCron } from '@/lib/cron/ksf-snapshot';
import { registerMesCron } from '@/lib/mes/sync-service';

/**
 * T10.3 ERP 야간 동기화 cron (PRD §8). 매일 03:00 KST = 18:00 UTC.
 * 기존 KSF(T4.4)·MES(T9.5) cron과 같은 등록 체계로 통합한다.
 * 스케줄 상수·환산은 ./cron-schedule(무의존)에서 import.
 */

let erpRegistered = false;

/** ERP cron 단독 등록 (서버 기동 시 호출, 빌드/테스트 시 미실행). */
export function registerErpCron(): cron.ScheduledTask {
  if (erpRegistered) throw new Error('ERP cron already registered');
  erpRegistered = true;
  return cron.schedule(ERP_SYNC_CRON, () => {
    void runErpSync();
  });
}

/**
 * 통합 스케줄 등록 — KSF(23:55 UTC) + MES(5분) + ERP(03:00 KST). 운영 엔트리에서 1회 호출.
 */
export function registerScheduledJobs(): cron.ScheduledTask[] {
  return [registerKsfCron(), registerMesCron(), registerErpCron()];
}
