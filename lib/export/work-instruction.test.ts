import { describe, it, expect } from 'vitest';
import { buildWorkInstructions, workInstructionId, type WIRow } from './work-instruction';

const rows: WIRow[] = [
  { date: '2026-02-02', line: 'LP-01', process: '성형', slot: '주간', productCode: 'P2', qty: 4, status: 'AUTO' },
  { date: '2026-02-02', line: 'LP-01', process: '성형', slot: '주간', productCode: 'P1', qty: 3, status: 'AUTO' },
  { date: '2026-02-02', line: 'EX-1', process: '압출', slot: 'DAY_FIRST', productCode: 'P9', qty: 100, status: 'AUTO' },
  { date: '2026-02-03', line: 'LP-02', process: '성형', slot: '야간', productCode: 'P5', qty: 6, status: 'CONFIRMED' },
];

describe('workInstructionId (T8.2)', () => {
  it('결정적 ID: WI-{date}-{M|E}-{line}', () => {
    expect(workInstructionId('2026-02-02', '성형', 'LP-01')).toBe('WI-20260202-M-LP-01');
    expect(workInstructionId('2026-02-02', '압출', 'EX-1')).toBe('WI-20260202-E-EX-1');
  });
});

describe('buildWorkInstructions (T8.2)', () => {
  it('(일자×공정×라인) 단위로 묶고 일자→공정(성형 먼저)→라인 정렬', () => {
    const wis = buildWorkInstructions(rows);
    expect(wis.map((w) => w.id)).toEqual([
      'WI-20260202-M-LP-01',
      'WI-20260202-E-EX-1',
      'WI-20260203-M-LP-02',
    ]);
  });

  it('같은 그룹의 행을 합치고 totalQty 집계', () => {
    const wis = buildWorkInstructions(rows);
    const first = wis[0];
    expect(first.rows).toHaveLength(2);
    expect(first.totalQty).toBe(7); // 4 + 3
    expect(first.rows[0].productCode).toBe('P1'); // 품번 정렬
  });

  it('0건이면 빈 배열', () => {
    expect(buildWorkInstructions([])).toEqual([]);
  });
});
