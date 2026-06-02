/**
 * T9.1 MES 연동 도메인 타입 (부록 H IMesClient 추상화, D20).
 * 실 MES 사양 미확정(TBD-3)이므로 인터페이스·Mock만 확정하고 Live는 Mock fallback.
 */

export type MesProcess = 'MOLDING' | 'EXTRUSION';

/** MES → EVS 작업실적 1건 (F-7.1). externalId로 멱등성 보장. */
export interface MesResultRecord {
  externalId: string; // MES 측 고유 ID (중복 수신 방지 키)
  equipmentCode: string;
  productCode: string;
  process: MesProcess;
  quantity: number;
  producedAt: string; // ISO8601
}

/** EVS → MES 작업지시 송신 payload (F-7.2). */
export interface MesInstructionPayload {
  instructionId: string;
  weekStart: string; // YYYY-MM-DD
  process: MesProcess;
  lines: { equipmentCode: string; productCode: string; quantity: number }[];
}

/** 송신 결과 — timeout 여부를 구분해 재시도 큐 적재 판단(AC T9.4-F1). */
export type MesSendResult =
  | { ok: true; ackId: string }
  | { ok: false; error: string; timeout: boolean };
