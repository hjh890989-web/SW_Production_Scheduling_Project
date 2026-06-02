import cron from 'node-cron';
import { prisma } from '@/lib/db';
import { retryWithBackoff, type RetryResult } from '@/lib/notification';
import { computeUnificationRate } from '@/lib/cron/ksf-metrics';

/** UTC 자정으로 정규화. */
function dayKey(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/**
 * KSF 일별 스냅샷 산출·적재 (T4.4 — AC T4.4-1).
 * 현재 산출 가능한 KSF-5(일원화율)만 채우고, KSF-1/6은 Sprint 5/6 데이터 이후 채운다.
 * DB 실패 시 retryWithBackoff 3회(AC T4.4-F1).
 */
export async function runKsfSnapshot(date: Date): Promise<RetryResult<{ date: Date }>> {
  return retryWithBackoff(async () => {
    const orders = await prisma.order.findMany({ select: { status: true } });
    const ksf5 = computeUnificationRate(orders);
    const key = dayKey(date);
    await prisma.ksfDailySnapshot.upsert({
      where: { date: key },
      update: { ksf5Unification: ksf5 },
      create: { date: key, ksf1Punctuality: null, ksf5Unification: ksf5, ksf6Adoption: null },
    });
    return { date: key };
  }, { maxRetries: 3 });
}

/** 매일 23:55 cron 등록 (서버 프로세스 기동 시 호출). 빌드/테스트 시 자동 실행되지 않는다. */
export function registerKsfCron(): cron.ScheduledTask {
  return cron.schedule('55 23 * * *', () => {
    void runKsfSnapshot(new Date());
  });
}
