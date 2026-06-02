import type { Severity } from '@/lib/impact/severity';

/**
 * 영향 심각도 색상 코딩 (T7.3 — AC PM-1-1). 순수 매핑.
 * critical 🔴 빨강(현장 확인) / warning 🟡 노랑(재계산 가능) / auto 🟢 초록(자동 재계산) / unknown ⚪ 회색.
 */
const STYLE: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-400',
  warning: 'bg-amber-100 text-amber-800 border-amber-400',
  auto: 'bg-green-100 text-green-800 border-green-400',
  unknown: 'bg-gray-100 text-gray-600 border-gray-300',
};

const LABEL: Record<Severity, string> = {
  critical: '🔴 진행중(현장 확인)',
  warning: '🟡 확정(재계산 가능)',
  auto: '🟢 자동(재계산)',
  unknown: '⚪ 미정',
};

export function severityStyle(severity: Severity): string {
  return STYLE[severity] ?? STYLE.unknown;
}

export function severityLabel(severity: Severity): string {
  return LABEL[severity] ?? LABEL.unknown;
}

export interface SeverityLegendItem {
  severity: Severity;
  label: string;
  className: string;
}

export const SEVERITY_LEGEND: SeverityLegendItem[] = (['critical', 'warning', 'auto'] as Severity[]).map((s) => ({
  severity: s,
  label: LABEL[s],
  className: STYLE[s],
}));
