/**
 * E그룹 색상 코딩 (T6.3 — AC ER-1-2). 1~8 distinct 팔레트, 미정의는 회색. 순수 함수.
 */
const E_PALETTE: Record<number, string> = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-amber-100 text-amber-800',
  4: 'bg-green-100 text-green-800',
  5: 'bg-teal-100 text-teal-800',
  6: 'bg-blue-100 text-blue-800',
  7: 'bg-indigo-100 text-indigo-800',
  8: 'bg-purple-100 text-purple-800',
};

const UNGROUPED = 'bg-gray-100 text-gray-500';

export function egroupColor(group: number | null | undefined): string {
  if (group == null || !E_PALETTE[group]) return UNGROUPED;
  return E_PALETTE[group];
}

export function egroupLabel(group: number | null | undefined): string {
  if (group == null || !E_PALETTE[group]) return '그룹 미정';
  return `E${group}`;
}

export interface EgroupLegendItem {
  label: string;
  className: string;
}

export const EGROUP_LEGEND: EgroupLegendItem[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ label: `E${i + 1}`, className: egroupColor(i + 1) })),
  { label: '그룹 미정', className: UNGROUPED },
];
