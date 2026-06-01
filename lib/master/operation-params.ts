/**
 * 운영 파라미터 정의 (T2.3 / T2.7 공용 — 부록 A.3).
 * 모든 value는 String으로 저장(CORE-1·AC T2.3-F1), 사용 시 parseFloat.
 * min/max는 T2.7 GUI Zod 검증에 사용.
 */
export interface ParamDef {
  key: string;
  label: string;
  category: 'molding' | 'extrusion' | 'rule';
  defaultValue: number;
  min: number;
  max: number;
}

export const PARAM_DEFS: ParamDef[] = [
  { key: 'lp_rotation_day', label: '저압 주간 회전수', category: 'molding', defaultValue: 8, min: 0, max: 24 },
  { key: 'lp_rotation_night', label: '저압 야간 회전수', category: 'molding', defaultValue: 10, min: 0, max: 24 },
  { key: 'ic_rotation_day', label: 'IC 주간 회전수', category: 'molding', defaultValue: 8, min: 0, max: 24 },
  { key: 'ic_rotation_night', label: 'IC 야간 회전수', category: 'molding', defaultValue: 10, min: 0, max: 24 },
  { key: 'rotation_minutes', label: '회전 1회 소요(분)', category: 'molding', defaultValue: 45, min: 1, max: 600 },
  { key: 'extrusion_shift_day_first', label: '압출 주간 전반(hr)', category: 'extrusion', defaultValue: 4, min: 0, max: 12 },
  { key: 'extrusion_shift_day_second', label: '압출 주간 후반(hr)', category: 'extrusion', defaultValue: 4, min: 0, max: 12 },
  { key: 'extrusion_shift_night_first', label: '압출 야간 전반(hr)', category: 'extrusion', defaultValue: 4.5, min: 0, max: 12 },
  { key: 'extrusion_shift_night_second', label: '압출 야간 후반(hr)', category: 'extrusion', defaultValue: 5, min: 0, max: 12 },
  { key: 'extrusion_efficiency', label: '압출 효율', category: 'extrusion', defaultValue: 0.75, min: 0, max: 1 },
  { key: 'angle_change_loss_rotations', label: '앵글 변경 손실(회전)', category: 'molding', defaultValue: 1, min: 0, max: 10 },
  { key: 'd2_rule_days', label: 'D-2 룰(일)', category: 'rule', defaultValue: 2, min: 0, max: 10 },
  { key: 'd1_rule_days', label: 'D-1 룰(일)', category: 'rule', defaultValue: 1, min: 0, max: 10 },
];

export const PARAM_BY_KEY: Record<string, ParamDef> = Object.fromEntries(
  PARAM_DEFS.map((p) => [p.key, p]),
);

export interface ParamValidation {
  ok: boolean;
  value?: number;
  error?: string;
  /** max 초과 — 사용자 확인 후 적용 가능 (AC T2.7-F1). */
  needsConfirm?: boolean;
}

/**
 * 파라미터 값 검증 (T2.7). min 미만은 거부(AC T2.7-2), max 초과는 확인 요청(AC T2.7-F1).
 */
export function validateParamValue(def: ParamDef, raw: string): ParamValidation {
  const value = Number(raw.trim());
  if (raw.trim() === '' || Number.isNaN(value)) {
    return { ok: false, error: '숫자를 입력하세요.' };
  }
  if (value < def.min) {
    return { ok: false, error: `${def.min} 이상이어야 합니다.` };
  }
  if (value > def.max) {
    return { ok: false, needsConfirm: true, value, error: `${def.max} 초과 — 정말 적용할까요?` };
  }
  return { ok: true, value };
}
