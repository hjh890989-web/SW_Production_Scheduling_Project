import type { MoldingStatus } from '@/lib/gantt/types';

/**
 * W-4 셀 색상 코딩 (T5.5 — 부록 H 베테랑 UX).
 * 자동=회색 / 수동=파란 테두리 / 확정=초록 체크 / 룰 위반=빨간 테두리(차단 X, 경고).
 */
const STATUS_CLASS: Record<MoldingStatus, string> = {
  AUTO: 'bg-gray-100 text-gray-700',
  MANUAL: 'border-2 border-blue-500 bg-blue-50 text-blue-800',
  CONFIRMED: 'border-2 border-green-500 bg-green-50 text-green-800',
};

export function cellClass(status: MoldingStatus, ruleViolation = false): string {
  const base = STATUS_CLASS[status] ?? STATUS_CLASS.AUTO;
  return ruleViolation ? `${base} ring-2 ring-red-500` : base;
}

/** 확정 셀에 표시할 체크 마크(없으면 빈 문자열). */
export function statusBadge(status: MoldingStatus): string {
  return status === 'CONFIRMED' ? '✓' : '';
}

export interface LegendItem {
  label: string;
  className: string;
}

export const SCHEDULE_LEGEND: LegendItem[] = [
  { label: '자동(AUTO)', className: cellClass('AUTO') },
  { label: '수동(MANUAL)', className: cellClass('MANUAL') },
  { label: '확정(CONFIRMED)', className: cellClass('CONFIRMED') },
  { label: '룰 위반(경고)', className: cellClass('AUTO', true) },
];
