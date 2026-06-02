import { describe, it, expect } from 'vitest';
import { buildWorkbookSpec, type MoldingExportRow, type ExtrusionExportRow } from './excel-exporter';
import { buildWorkInstructions, type WIRow } from './work-instruction';
import { buildQuarterlyReport, type SnapshotInput } from './quarterly-report';

/**
 * T8.4 Sprint 8 통합 검증 — 세 출력(엑셀/작업지시서/분기 리포트)의 형식·정확성을 교차 확인.
 * E2E(export.spec.ts)는 `npm run test:e2e`로 분리; 본 테스트는 5종 게이트(vitest)에 포함된다.
 */
describe('T8.4: 엑셀 export 형식 검증 (시트명·셀 위치)', () => {
  const molding: MoldingExportRow[] = [
    { date: '2026-02-02', daynight: 'DAY', equipmentCode: 'LP-01', slotPosition: 'A', productCode: 'P1', rotations: 4, status: 'CONFIRMED' },
  ];
  const extrusion: ExtrusionExportRow[] = [
    { date: '2026-02-02', shift: 'DAY_FIRST', extruderCode: 'EX-1', productCode: 'P9', quantity: 100, headPin: 'H1', status: 'CONFIRMED' },
  ];

  it('시트명 규약 + 헤더 셀 위치가 명세(성형/압출/요약)와 일치', () => {
    const wb = buildWorkbookSpec(molding, extrusion);
    expect(wb.sheets.map((s) => s.name)).toEqual(['2월2일(성형)', '2월2일(압출)', '요약']);
    // 셀 위치: 성형 헤더 4번째 칸 = '슬롯', 데이터 5번째 칸 = 품번
    const m = wb.sheets[0];
    expect(m.rows[0][3]).toBe('슬롯');
    expect(m.rows[1][4]).toBe('P1');
  });
});

describe('T8.4: PDF 인쇄 데이터 정합 (작업지시서 그룹·합계)', () => {
  it('일자×공정×라인 그룹 수와 합계가 입력과 일치(A4 페이지 분할 단위)', () => {
    const rows: WIRow[] = [
      { date: '2026-02-02', line: 'LP-01', process: '성형', slot: '주간/A', productCode: 'P1', qty: 4, status: 'AUTO' },
      { date: '2026-02-02', line: 'LP-01', process: '성형', slot: '주간/B', productCode: 'P2', qty: 6, status: 'AUTO' },
      { date: '2026-02-02', line: 'EX-1', process: '압출', slot: 'DAY_FIRST', productCode: 'P9', qty: 100, status: 'AUTO' },
    ];
    const wis = buildWorkInstructions(rows);
    expect(wis).toHaveLength(2); // 성형 LP-01 1장 + 압출 EX-1 1장
    expect(wis[0].totalQty).toBe(10);
  });
});

describe('T8.4: 분기 보고서 데이터 정확성', () => {
  it('Before/After 평균·delta가 산술적으로 정확', () => {
    const snaps: SnapshotInput[] = [
      { date: '2026-04-10', ksf1Punctuality: 0.8, ksf5Unification: 0.6, ksf6Adoption: 0.5 },
      { date: '2026-06-10', ksf1Punctuality: 1.0, ksf5Unification: 0.8, ksf6Adoption: 0.9 },
    ];
    const report = buildQuarterlyReport(snaps, '2026-05-01', '2026-Q2');
    expect(report.before.ksf1Avg).toBe(0.8);
    expect(report.after.ksf1Avg).toBe(1.0);
    expect(report.delta.ksf1).toBeCloseTo(0.2, 5);
  });
});
