import type { ErpItemRecord } from './types';

/**
 * 영림원 ERP 클라이언트 추상화 (T10.1, D20). 표준 API/DB/Mock 구현을 교체 가능하게 격리.
 */
export interface IErpClient {
  readonly kind: 'api' | 'db' | 'mock';
  /** ERP 품번 마스터 조회. ERP 다운 시 throw → 호출자(route)가 실패 처리. */
  fetchItems(): Promise<ErpItemRecord[]>;
}
