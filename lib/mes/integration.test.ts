import { describe, it, expect } from 'vitest';
import type { IMesClient } from './IMesClient';
import type { MesResultRecord, MesInstructionPayload, MesSendResult } from './types';
import { shouldRetry, nextRetryAt } from './retry-policy';
import { shouldAlert, pickDueRetries } from './sync-policy';
import { applyInventoryDelta, productionDelta } from '@/lib/inventory/delta';

/**
 * T9.6 MES 통합 테스트 (정상·timeout·다운 시나리오 + 재시도 큐 + 재고 누적).
 * 실 MES 미확정(TBD-3)이므로 IMesClient Mock 변형으로 시나리오를 구동(외부 호출 없음).
 * 부수효과(DB)는 route/service가 담당하고, 본 테스트는 클라이언트 결과 × 정책의 결합을 검증한다.
 */
const PAYLOAD: MesInstructionPayload = { instructionId: 'WI-1', weekStart: '2026-06-01', process: 'EXTRUSION', lines: [] };

class NormalMock implements IMesClient {
  readonly kind = 'mock' as const;
  constructor(private seed: MesResultRecord[] = []) {}
  async fetchResults(since: string) {
    return this.seed.filter((r) => r.producedAt >= since);
  }
  async sendInstruction(p: MesInstructionPayload): Promise<MesSendResult> {
    return { ok: true, ackId: `ACK-${p.instructionId}` };
  }
}
class TimeoutMock implements IMesClient {
  readonly kind = 'mock' as const;
  async fetchResults() {
    return [];
  }
  async sendInstruction(): Promise<MesSendResult> {
    return { ok: false, error: 'timeout', timeout: true };
  }
}
class DownMock implements IMesClient {
  readonly kind = 'mock' as const;
  async fetchResults(): Promise<MesResultRecord[]> {
    throw new Error('ECONNREFUSED');
  }
  async sendInstruction(): Promise<MesSendResult> {
    return { ok: false, error: 'ECONNREFUSED', timeout: false };
  }
}

/** 재시도 큐 1건의 수명주기를 정책으로 시뮬레이션(서비스 DB 로직과 동일 규칙). */
async function simulateLifecycle(client: IMesClient, maxAttempts: number, start: Date) {
  let attempts = 0;
  let status: 'PENDING' | 'SENT' | 'FAILED' = 'PENDING';
  let alerted = false;
  let t = start;
  while (status === 'PENDING') {
    const res = await client.sendInstruction(PAYLOAD);
    attempts += 1;
    if (res.ok) status = 'SENT';
    else if (shouldRetry(attempts, maxAttempts)) t = nextRetryAt(t);
    else {
      status = 'FAILED';
      alerted = shouldAlert(1);
    }
  }
  return { status, attempts, alerted, lastRetryAt: t };
}

describe('T9.6 시나리오: 정상', () => {
  it('정상 송신 → 1회 SENT, 알림 없음', async () => {
    const r = await simulateLifecycle(new NormalMock(), 5, new Date('2026-06-01T00:00:00.000Z'));
    expect(r.status).toBe('SENT');
    expect(r.attempts).toBe(1);
    expect(r.alerted).toBe(false);
  });

  it('fetchResults는 since 이후만 반환', async () => {
    const client = new NormalMock([
      { externalId: 'e1', equipmentCode: 'EX-1', productCode: 'P1', process: 'EXTRUSION', quantity: 10, producedAt: '2026-06-01T00:00:00.000Z' },
      { externalId: 'e2', equipmentCode: 'EX-1', productCode: 'P1', process: 'EXTRUSION', quantity: 20, producedAt: '2026-06-02T00:00:00.000Z' },
    ]);
    const got = await client.fetchResults('2026-06-01T12:00:00.000Z');
    expect(got.map((r) => r.externalId)).toEqual(['e2']);
  });
});

describe('T9.6 시나리오: timeout → 재시도 소진 → FAILED + 알림', () => {
  it('timeout은 maxAttempts까지 재시도 후 FAILED, 알림 발송', async () => {
    const r = await simulateLifecycle(new TimeoutMock(), 5, new Date('2026-06-01T00:00:00.000Z'));
    expect(r.status).toBe('FAILED');
    expect(r.attempts).toBe(5);
    expect(r.alerted).toBe(true);
  });
});

describe('T9.6 시나리오: MES 다운', () => {
  it('다운(연결 거부) 송신도 재시도 소진 후 FAILED', async () => {
    const r = await simulateLifecycle(new DownMock(), 3, new Date('2026-06-01T00:00:00.000Z'));
    expect(r.status).toBe('FAILED');
    expect(r.attempts).toBe(3);
  });

  it('다운 시 fetchResults는 예외 → 동기화 실패로 처리(연속 실패 알림 대상)', async () => {
    await expect(new DownMock().fetchResults()).rejects.toThrow('ECONNREFUSED');
  });
});

describe('T9.6 재시도 큐 도래 선별 + 재고 누적', () => {
  it('PENDING·도래 항목만 처리 대상', () => {
    const now = new Date('2026-06-01T01:00:00.000Z');
    const due = pickDueRetries(
      [
        { status: 'PENDING', nextRetryAt: new Date('2026-06-01T00:55:00.000Z') },
        { status: 'FAILED', nextRetryAt: new Date('2026-06-01T00:00:00.000Z') },
      ],
      now,
    );
    expect(due).toHaveLength(1);
  });

  it('여러 실적 적재 시 재고가 누적되고 음수 없음', () => {
    let qty = 0;
    for (const q of [100, 50, 30]) {
      const { next, negative } = applyInventoryDelta(qty, productionDelta(q));
      expect(negative).toBe(false);
      qty = next;
    }
    expect(qty).toBe(180);
  });
});
