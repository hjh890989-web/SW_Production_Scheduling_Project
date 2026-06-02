import { normalizeMaterial, type Material } from './material';

/**
 * T12.6.2 EPDM·NBR 합성 시드 품번 (점진 확대 검증용, 실데이터 아님).
 * 실 OEM 품번은 Raw Materials(실리콘 47품번)에서 오고, 본 시드는 자재 확대 UI·KSF 검증용 표본.
 */
export interface MaterialSeedItem {
  productCode: string;
  material: Material;
  customerCode: string;
}

export function buildMaterialSeedItems(): MaterialSeedItem[] {
  const raw = [
    { productCode: 'EPDM-SAMPLE-01', material: 'epdm', customerCode: 'SYN-E1' },
    { productCode: 'EPDM-SAMPLE-02', material: 'EPDM', customerCode: 'SYN-E2' },
    { productCode: 'NBR-SAMPLE-01', material: 'nitrile', customerCode: 'SYN-N1' },
    { productCode: 'NBR-SAMPLE-02', material: 'NBR', customerCode: 'SYN-N2' },
  ];
  return raw.map((r) => ({ ...r, material: normalizeMaterial(r.material) }));
}
