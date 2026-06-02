import type { SchedulerItem } from '@/lib/scheduler/molding-scheduler';

/**
 * 마스터(Item) → 스케줄러 입력 변환 + 슬롯 적격성 도출 (T5.4).
 * 마스터에 위치별 O/X가 lpPosTop만 있으므로:
 *  - 저압(lpMoldsPerAngle>0): LP 슬롯 중 TOP은 lpPosTop일 때만 허용, 그 외 허용.
 *  - IC(icMoldsPerAngle>0): IC 슬롯 전부 허용.
 *  - 둘 다 0/없음: 성형 불가 → null (호출부에서 경고).
 * (제한적 마스터 데이터 하의 결정적 도출 — 위치별 O/X 전면 도입 시 교체.)
 */
export interface MasterItem {
  id: string;
  productCode: string;
  lpMoldsPerAngle: number | null;
  icMoldsPerAngle: number | null;
  lpPosTop: boolean;
}

export function deriveSchedulerItem(
  item: MasterItem,
  lpSlots: string[],
  icSlots: string[],
): SchedulerItem | null {
  const lp = item.lpMoldsPerAngle ?? 0;
  const ic = item.icMoldsPerAngle ?? 0;

  if (lp > 0) {
    const allowedSlots = lpSlots.filter((s) => (s.includes('TOP') ? item.lpPosTop : true));
    return { itemId: item.id, productCode: item.productCode, moldsPerAngle: lp, equipmentType: 'MOLDING_LP', allowedSlots };
  }
  if (ic > 0) {
    return { itemId: item.id, productCode: item.productCode, moldsPerAngle: ic, equipmentType: 'MOLDING_IC', allowedSlots: [...icSlots] };
  }
  return null;
}
