/**
 * T12.3.1 스케줄 알고리즘 토글 — 순수 함수. 룰 기반 ↔ 솔버(OR-Tools) 전환 상태.
 */
export type Algorithm = 'rule' | 'solver';

export const ALGORITHM_LABEL: Record<Algorithm, string> = {
  rule: '룰 기반(기본)',
  solver: '솔버(OR-Tools)',
};

export function toggleAlgorithm(current: Algorithm): Algorithm {
  return current === 'rule' ? 'solver' : 'rule';
}

/** 솔버 미가동 안내 필요 여부(현재 솔버는 Mock — 룰 권장). */
export function needsSolverNotice(algo: Algorithm): boolean {
  return algo === 'solver';
}
