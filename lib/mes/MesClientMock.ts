import type { IMesClient } from './IMesClient';
import type { MesResultRecord, MesInstructionPayload, MesSendResult } from './types';

/**
 * 테스트·개발용 Mock MES 클라이언트 (T9.1). 실 MES 사양 미확정(TBD-3) 동안 기본 구현체.
 * 외부 호출 없이 결정적으로 동작한다(사내망·외부 호출 금지 준수).
 */
export class MesClientMock implements IMesClient {
  readonly kind = 'mock' as const;

  /** 주입된 시드 실적. 미주입 시 빈 배열(0건 동기화). */
  constructor(private readonly seed: MesResultRecord[] = []) {}

  async fetchResults(sinceISO: string): Promise<MesResultRecord[]> {
    return this.seed.filter((r) => r.producedAt >= sinceISO);
  }

  async sendInstruction(payload: MesInstructionPayload): Promise<MesSendResult> {
    // Mock은 항상 즉시 ACK. timeout/실패 시나리오는 테스트에서 별도 Mock으로 주입.
    return { ok: true, ackId: `MOCK-ACK-${payload.instructionId}` };
  }
}
