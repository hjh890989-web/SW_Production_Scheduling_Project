import type { Material } from './material';

/**
 * T12.6.3 자재 필터 — 순수 함수. 'ALL'이면 전체, 아니면 해당 자재만.
 */
export type MaterialFilter = Material | 'ALL';

export function filterByMaterial<T extends { material: string }>(rows: T[], filter: MaterialFilter): T[] {
  return filter === 'ALL' ? rows : rows.filter((r) => r.material === filter);
}

/** 자재별 건수 집계(필터 UI 배지용). */
export function countByMaterial<T extends { material: string }>(rows: T[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.material] = (acc[r.material] ?? 0) + 1;
    return acc;
  }, {});
}
