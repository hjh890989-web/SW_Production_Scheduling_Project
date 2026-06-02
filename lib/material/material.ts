/**
 * T12.6.1 자재(material) 정규화·검증 (R-6 점진 확대: 실리콘 → EPDM/NBR).
 * SQLite enum 미지원이라 String 유지 + 앱 레벨 TS union·정규화로 무결성 보장(CORE-1).
 * 기존 'silicone' 데이터는 그대로 유효(마이그레이션 불필요).
 */

export const MATERIALS = ['silicone', 'EPDM', 'NBR'] as const;
export type Material = (typeof MATERIALS)[number];

/** 표기 흔들림 → 표준 코드 매핑(소문자 키). */
const ALIASES: Record<string, Material> = {
  silicone: 'silicone',
  '실리콘': 'silicone',
  si: 'silicone',
  vmq: 'silicone',
  epdm: 'EPDM',
  'e.p.d.m': 'EPDM',
  nbr: 'NBR',
  'n.b.r': 'NBR',
  'nitrile': 'NBR',
};

export const MATERIAL_LABEL: Record<Material, string> = {
  silicone: '실리콘',
  EPDM: 'EPDM',
  NBR: 'NBR',
};

/** 이미 표준 코드인지 판정. */
export function isValidMaterial(raw: unknown): raw is Material {
  return typeof raw === 'string' && (MATERIALS as readonly string[]).includes(raw);
}

/** 임의 입력 → 표준 코드. 미상/빈값은 기존 기본 'silicone'(무결성 유지). */
export function normalizeMaterial(raw: string | null | undefined): Material {
  if (!raw) return 'silicone';
  const key = raw.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const exact = MATERIALS.find((m) => m.toLowerCase() === key);
  return exact ?? 'silicone';
}
