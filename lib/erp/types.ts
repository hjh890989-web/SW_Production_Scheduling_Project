/**
 * T10.1 영림원 ERP 연동 도메인 타입 (D7 표준 API 우선, D20 추상화).
 * 실 ERP 표준 API 미확정(TBD-2)이므로 인터페이스·Mock만 확정.
 * ERP는 읽기 소스 — Item 마스터의 source of truth(품번·거래처·코드).
 */

/** ERP 품번 마스터 1건 → 우리 Item upsert 입력. */
export interface ErpItemRecord {
  productCode: string; // 생산 품번(키)
  customerCode?: string | null; // 고객사 품번
  hwasungCode?: string | null; // ERP(화성) 코드
  material?: string | null; // 소재
}
