import { describe, it, expect } from 'vitest';
import {
  buildWorkbookSpec,
  dateSheetLabel,
  sanitizeSheetName,
  type MoldingExportRow,
  type ExtrusionExportRow,
} from './excel-exporter';

const molding: MoldingExportRow[] = [
  { date: '2026-02-03', daynight: 'DAY', equipmentCode: 'LP-02', slotPosition: 'A', productCode: 'P2', rotations: 5, status: 'AUTO' },
  { date: '2026-02-02', daynight: 'NIGHT', equipmentCode: 'LP-01', slotPosition: 'B', productCode: 'P1', rotations: 3, status: 'CONFIRMED' },
  { date: '2026-02-02', daynight: 'DAY', equipmentCode: 'LP-01', slotPosition: 'A', productCode: 'P0', rotations: 4, status: 'AUTO' },
];

const extrusion: ExtrusionExportRow[] = [
  { date: '2026-02-02', shift: 'DAY_FIRST', extruderCode: 'EX-1', productCode: 'P9', quantity: 100, headPin: 'H1', status: 'AUTO' },
];

describe('dateSheetLabel / sanitizeSheetName (T8.1)', () => {
  it('YYYY-MM-DD → M월D일 (앞자리 0 제거)', () => {
    expect(dateSheetLabel('2026-02-03')).toBe('2월3일');
    expect(dateSheetLabel('2026-12-31')).toBe('12월31일');
  });

  it('잘못된 날짜는 원문 유지', () => {
    expect(dateSheetLabel('bad')).toBe('bad');
  });

  it('시트명 금지문자 치환·31자 절단', () => {
    expect(sanitizeSheetName('a/b:c[d]')).toBe('a_b_c_d_');
    expect(sanitizeSheetName('x'.repeat(40)).length).toBe(31);
  });
});

describe('buildWorkbookSpec (T8.1)', () => {
  it('일자별 성형/압출 시트 + 요약 시트를 생성', () => {
    const wb = buildWorkbookSpec(molding, extrusion);
    const names = wb.sheets.map((s) => s.name);
    expect(names).toEqual(['2월2일(성형)', '2월3일(성형)', '2월2일(압출)', '요약']);
    expect(wb.isEmpty).toBe(false);
  });

  it('성형 시트는 헤더 + 해당 일자 행만, 가류기·슬롯 정렬', () => {
    const wb = buildWorkbookSpec(molding, extrusion);
    const feb2 = wb.sheets.find((s) => s.name === '2월2일(성형)')!;
    expect(feb2.rows[0]).toEqual(['일자', '주야', '가류기', '슬롯', '품번', '회전수', '상태']);
    expect(feb2.rows).toHaveLength(3); // 헤더 + 2건
    expect(feb2.rows[1]).toEqual(['2026-02-02', '주간', 'LP-01', 'A', 'P0', 4, 'AUTO']);
  });

  it('요약 시트는 성형/압출 건수·합계 집계', () => {
    const wb = buildWorkbookSpec(molding, extrusion);
    const summary = wb.sheets.find((s) => s.name === '요약')!;
    expect(summary.rows).toEqual([
      ['구분', '건수', '합계'],
      ['성형', 3, 12], // rotations 5+3+4
      ['압출', 1, 100],
    ]);
  });

  it('0건이면 isEmpty=true, 요약 시트만 존재(다운로드 안내용)', () => {
    const wb = buildWorkbookSpec([], []);
    expect(wb.isEmpty).toBe(true);
    expect(wb.sheets.map((s) => s.name)).toEqual(['요약']);
  });
});
