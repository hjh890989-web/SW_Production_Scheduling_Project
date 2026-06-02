/**
 * T12.5.4 스켈레톤 유틸 — 순수 함수. 안정적 key 배열 생성(렌더 시 index-key 경고 방지).
 */
export function skeletonKeys(count: number, prefix = 'sk'): string[] {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
}
