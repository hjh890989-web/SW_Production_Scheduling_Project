/**
 * T8.2 일별·라인별 작업지시서 — 스케줄 행을 (일자×라인×공정) 단위 지시서로 묶는 순수 함수.
 * 출력은 `window.print()` + A4 인쇄 CSS로 PDF를 갈음(CORE-2, 서버 PDF 금지).
 * QR 코드는 신규 의존성 없이 작업지시 ID 텍스트로 표기(추후 MES 연동, MINOR-2).
 */

export type WIProcess = '성형' | '압출';

export interface WIRow {
  date: string; // YYYY-MM-DD
  line: string; // 가류기/압출기 코드
  process: WIProcess;
  slot: string; // 성형=주야/슬롯, 압출=교대
  productCode: string;
  qty: number; // 성형=회전수, 압출=수량
  status: string;
}

export interface WorkInstruction {
  id: string; // 작업지시 ID (QR 대용 텍스트)
  date: string;
  line: string;
  process: WIProcess;
  rows: WIRow[];
  totalQty: number;
}

/** 작업지시 ID: `WI-{date}-{성형|압출}-{line}`. 결정적(같은 입력 → 같은 ID). */
export function workInstructionId(date: string, process: WIProcess, line: string): string {
  const tag = process === '성형' ? 'M' : 'E';
  return `WI-${date.replace(/-/g, '')}-${tag}-${line}`;
}

/**
 * 행들을 (일자, 공정, 라인) 단위로 묶어 작업지시서 목록 생성. 일자→공정→라인 순 정렬.
 */
export function buildWorkInstructions(rows: WIRow[]): WorkInstruction[] {
  const groups = new Map<string, WorkInstruction>();
  for (const r of rows) {
    const key = `${r.date}|${r.process}|${r.line}`;
    let wi = groups.get(key);
    if (!wi) {
      wi = {
        id: workInstructionId(r.date, r.process, r.line),
        date: r.date,
        line: r.line,
        process: r.process,
        rows: [],
        totalQty: 0,
      };
      groups.set(key, wi);
    }
    wi.rows.push(r);
    wi.totalQty += r.qty;
  }

  const processOrder: Record<WIProcess, number> = { 성형: 0, 압출: 1 };
  return [...groups.values()]
    .map((wi) => ({
      ...wi,
      rows: [...wi.rows].sort((a, b) => a.slot.localeCompare(b.slot) || a.productCode.localeCompare(b.productCode)),
    }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        processOrder[a.process] - processOrder[b.process] ||
        a.line.localeCompare(b.line),
    );
}
