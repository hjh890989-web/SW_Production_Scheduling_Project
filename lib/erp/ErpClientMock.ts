import type { IErpClient } from './IErpClient';
import type { ErpItemRecord } from './types';

/**
 * 테스트·개발용 Mock ERP 클라이언트 (T10.1). 실 ERP 미확정(TBD-2) 동안 기본 동작 구현체.
 * 외부 호출 없이 결정적으로 동작(사내망·외부 호출 금지 준수). down=true면 ERP 다운 시뮬.
 */
export class ErpClientMock implements IErpClient {
  readonly kind = 'mock' as const;

  constructor(
    private readonly seed: ErpItemRecord[] = [],
    private readonly down = false,
  ) {}

  async fetchItems(): Promise<ErpItemRecord[]> {
    if (this.down) throw new Error('ERP unreachable (mock down)');
    return this.seed;
  }
}
