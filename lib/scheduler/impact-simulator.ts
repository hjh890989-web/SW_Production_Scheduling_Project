import { statusSeverity, type Severity } from '@/lib/impact/severity';

/**
 * 영향 시뮬레이터 (T7.1 — R-8, AC PM-1). 순수 함수, dryRun(DB 변경 X).
 * 변동 입력에 영향받는 기존 스케줄(같은 품번)을 식별·분류하고 좌표를 반환한다.
 * 진행중(STARTED/COMPLETED) 건도 차단·변경하지 않고 식별·경고만 한다.
 */
export interface ScheduleRef {
  process: 'MOLDING' | 'EXTRUSION';
  scheduleId: string;
  itemId: string;
  productCode: string;
  date: string;
  status: string;
  rowKey: string; // 그리드 행 키 (이동·하이라이트 좌표)
  colKey: string; // 그리드 열 키
}

export interface OrderChange {
  itemId: string;
  productCode?: string;
  changeType: string; // 수량 / 일자 / 추가 / 취소
  newValue?: string;
  deliveryDate?: string;
}

export interface ImpactEntry extends ScheduleRef {
  severity: Severity;
}

export interface ImpactResult {
  affected: ImpactEntry[];
  counts: Record<Severity, number>;
  total: number;
  degraded: boolean; // MES 미연동 등 Degraded Mode (DB만)
}

export function simulateImpact(
  change: OrderChange,
  schedules: ScheduleRef[],
  opts: { degraded?: boolean } = {},
): ImpactResult {
  const affected: ImpactEntry[] = schedules
    .filter((s) => s.itemId === change.itemId)
    .map((s) => ({ ...s, severity: statusSeverity(s.status) }));

  const counts: Record<Severity, number> = { critical: 0, warning: 0, auto: 0, unknown: 0 };
  for (const a of affected) counts[a.severity] += 1;

  return { affected, counts, total: affected.length, degraded: opts.degraded ?? false };
}
