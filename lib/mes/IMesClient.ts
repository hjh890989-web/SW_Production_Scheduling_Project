import type { MesResultRecord, MesInstructionPayload, MesSendResult } from './types';

/**
 * MES 연동 클라이언트 추상화 (T9.1, 부록 H). Live/Mock 교체 가능하게 인터페이스로 격리.
 * 향후 OR-Tools 분리처럼 MES 어댑터도 본 인터페이스 뒤에서 교체한다.
 */
export interface IMesClient {
  readonly kind: 'mock' | 'live';
  /** since 이후 작업실적 조회 (폴링·pull, T9.2/T9.5). */
  fetchResults(sinceISO: string): Promise<MesResultRecord[]>;
  /** 작업지시 송신 (확정 시 자동, T9.4). 실패/timeout은 ok:false로 반환. */
  sendInstruction(payload: MesInstructionPayload): Promise<MesSendResult>;
}
