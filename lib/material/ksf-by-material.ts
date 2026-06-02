import { MATERIALS } from './material';

/**
 * T12.6.4 KSF 자재별 집계 — 순수 함수. 자재 확대 후 실리콘/EPDM/NBR별 납기율 등 분해.
 * 입력은 ProductionResult×Item.material 조인 결과(레코드당 onTime 여부) 가정.
 */
export interface MaterialKsfRecord {
  material: string;
  onTime: boolean;
}

export interface MaterialKsf {
  material: string;
  total: number;
  onTime: number;
  /** 납기율(0~1). total 0이면 null. */
  punctuality: number | null;
}

/** 자재별 납기율 집계. MATERIALS 순서로 정렬, 데이터 없는 자재는 제외. */
export function aggregateKsfByMaterial(records: MaterialKsfRecord[]): MaterialKsf[] {
  const acc = new Map<string, { total: number; onTime: number }>();
  for (const r of records) {
    const cur = acc.get(r.material) ?? { total: 0, onTime: 0 };
    cur.total += 1;
    if (r.onTime) cur.onTime += 1;
    acc.set(r.material, cur);
  }
  const order = (m: string) => {
    const i = (MATERIALS as readonly string[]).indexOf(m);
    return i === -1 ? MATERIALS.length : i;
  };
  return [...acc.entries()]
    .map(([material, { total, onTime }]) => ({
      material,
      total,
      onTime,
      punctuality: total > 0 ? Math.round((onTime / total) * 1000) / 1000 : null,
    }))
    .sort((a, b) => order(a.material) - order(b.material));
}
