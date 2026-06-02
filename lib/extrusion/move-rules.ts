/**
 * 압출 드래그 이동 규칙 (T6.6 — 차단하지 않고 경고만). 순수 함수.
 * 대상 압출기가 품번과 비호환(extruderFord/New)이면 ruleViolation=true(이동은 허용).
 */
export function evaluateExtMove(
  targetExtruder: string,
  item: { extruderFord: boolean; extruderNew: boolean },
): { ruleViolation: boolean } {
  const compatible =
    (targetExtruder === 'FORD' && item.extruderFord) || (targetExtruder === 'NEW' && item.extruderNew);
  return { ruleViolation: !compatible };
}
