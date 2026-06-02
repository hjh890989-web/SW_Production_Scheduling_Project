/**
 * KSF 지표 산출 (T4.4, PRD §1.5). 순수 함수 — DB 조회는 ksf-snapshot.ts.
 * 데이터가 없으면 null(미산출)을 반환한다.
 */

/** KSF-1 납기율 = 정시 완료 / 전체 (ProductionResult 기반, Sprint 6+). */
export function computePunctuality(results: { onTime: boolean }[]): number | null {
  if (results.length === 0) return null;
  return results.filter((r) => r.onTime).length / results.length;
}

/** KSF-5 수주 일원화율 = ACTIVE / (ACTIVE + SUPERSEDED). */
export function computeUnificationRate(orders: { status: string }[]): number | null {
  const considered = orders.filter((o) => o.status === 'ACTIVE' || o.status === 'SUPERSEDED');
  if (considered.length === 0) return null;
  const active = considered.filter((o) => o.status === 'ACTIVE').length;
  return active / considered.length;
}

/** KSF-6 수동보정 채택률 = 채택 / 전체 (J-MR-2, Sprint 5+). */
export function computeAdoptionRate(corrections: { adopted: boolean }[]): number | null {
  if (corrections.length === 0) return null;
  return corrections.filter((c) => c.adopted).length / corrections.length;
}
