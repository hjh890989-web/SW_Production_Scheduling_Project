import type { IMesClient } from './IMesClient';
import { MesClientMock } from './MesClientMock';

/**
 * MES 클라이언트 선택 (T9.1). env `MES_CLIENT`로 구현체 결정.
 * 실 MES 사양 미확정(TBD-3)이므로 'live' 요청도 현재는 Mock으로 fallback + 경고(AC T9.1-F1).
 */
export interface MesClientResolution {
  kind: 'mock';
  /** fallback/선택 사유 — 경고·audit에 사용. */
  reason: string;
}

/** 순수 판정: env 값 → 사용할 구현체 종류와 사유. */
export function resolveMesClientKind(envValue: string | undefined): MesClientResolution {
  if (envValue === 'live') {
    return { kind: 'mock', reason: 'TBD-3 미해소: 실 MES 사양 미확정으로 Mock fallback' };
  }
  if (!envValue || envValue === 'mock') {
    return { kind: 'mock', reason: '기본 mock' };
  }
  return { kind: 'mock', reason: `알 수 없는 MES_CLIENT='${envValue}' → mock fallback` };
}

/** 구현체 인스턴스 생성. 'live' fallback 시 경고 로그. */
export function createMesClient(envValue: string | undefined = process.env.MES_CLIENT): IMesClient {
  const resolution = resolveMesClientKind(envValue);
  if (envValue === 'live') {
    console.warn(`[MES] ${resolution.reason}`);
  }
  return new MesClientMock();
}
