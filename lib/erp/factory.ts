import type { IErpClient } from './IErpClient';
import { ErpClientMock } from './ErpClientMock';

/**
 * ERP 클라이언트 선택 + fallback 체인 (T10.1). 우선순위 [api → db → mock].
 * 실 ERP 표준 API 미확정(TBD-2)이라 동작 구현체는 Mock뿐이지만, 선택·fallback 판정은 순수 함수로 확정.
 * AC T10.1-F1: API 미응답 시 DB fallback 자동 시도.
 */
export type ErpSource = 'api' | 'db' | 'mock';

export interface ErpResolution {
  source: ErpSource;
  reason: string;
}

/**
 * env 선호도 + 가용성으로 사용할 소스 판정. mock은 항상 가용.
 * - 기본/`api`: api → db → mock 순 첫 가용
 * - `db`: db → mock
 * - `mock`: mock
 */
export function resolveErpSource(
  envValue: string | undefined,
  available: { api: boolean; db: boolean },
): ErpResolution {
  if (envValue === 'mock') {
    return { source: 'mock', reason: '명시 mock' };
  }
  if (envValue === 'db') {
    if (available.db) return { source: 'db', reason: 'DB 계정(SELECT 전용) 사용' };
    return { source: 'mock', reason: 'DB 미응답 → mock fallback' };
  }
  // 기본 또는 'api'
  if (available.api) return { source: 'api', reason: '표준 API 사용' };
  if (available.db) return { source: 'db', reason: 'API 미응답 → DB fallback(AC T10.1-F1)' };
  return { source: 'mock', reason: 'API·DB 미응답 → mock fallback' };
}

/**
 * 구현체 생성. 실 ERP 미확정(TBD-2)이므로 현재 가용 소스는 api/db 모두 false →
 * 항상 Mock으로 귀결되며 fallback 사유를 경고로 남긴다.
 */
export function createErpClient(envValue: string | undefined = process.env.ERP_CLIENT): IErpClient {
  const resolution = resolveErpSource(envValue, { api: false, db: false });
  if (resolution.source !== 'mock') {
    // 미도달 분기(실 구현 도입 시 대체) — 방어적 경고
    console.warn(`[ERP] ${resolution.source} 구현 미도입 → mock`);
  } else if (envValue && envValue !== 'mock') {
    console.warn(`[ERP] ${resolution.reason}`);
  }
  return new ErpClientMock();
}
