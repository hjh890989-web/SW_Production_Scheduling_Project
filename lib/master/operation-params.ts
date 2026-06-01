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
