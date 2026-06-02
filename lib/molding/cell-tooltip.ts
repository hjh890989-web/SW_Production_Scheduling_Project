import type { GridCell, MoldingStatus } from '@/lib/gantt/types';

const STATUS_LABEL: Record<MoldingStatus, string> = {
  AUTO: '자동(백워드 D-2)',
  MANUAL: '수동 보정',
  CONFIRMED: '확정',
};

/**
 * "왜 이 결과?" 셀 설명 (T5.9). 품번·회전수·근거·위반 여부. 순수 함수.
 */
export function explainCell(cell: Pick<GridCell, 'productCode' | 'rotations' | 'status' | 'ruleViolation'>): string {
  const parts = [
    `품번 ${cell.productCode}`,
    `회전수 ${cell.rotations}회`,
    `근거: ${STATUS_LABEL[cell.status as MoldingStatus] ?? cell.status}`,
  ];
  if (cell.ruleViolation) parts.push('⚠️ 위치 제약(O/X) 위반 — 확인 필요');
  return parts.join(' · ');
}
