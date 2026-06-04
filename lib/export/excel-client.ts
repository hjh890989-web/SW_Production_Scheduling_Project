'use client';

import ExcelJS from 'exceljs';
import {
  buildWorkbookSpec,
  type MoldingExportRow,
  type ExtrusionExportRow,
} from './excel-exporter';

export interface DownloadResult {
  ok: boolean;
  message: string;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * T8.1 — 성형·압출 스케줄을 .xlsx로 클라이언트 다운로드 (exceljs, 브라우저 writeBuffer+Blob).
 * 데이터 0건이면 다운로드하지 않고 "데이터 없음" 반환 (AC T8.1-F1).
 */
export async function downloadScheduleExcel(
  molding: MoldingExportRow[],
  extrusion: ExtrusionExportRow[],
  filename: string,
): Promise<DownloadResult> {
  const spec = buildWorkbookSpec(molding, extrusion);
  if (spec.isEmpty) {
    return { ok: false, message: '데이터 없음 — 내보낼 스케줄이 없습니다.' };
  }
  const wb = new ExcelJS.Workbook();
  for (const sheet of spec.sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.addRows(sheet.rows);
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, message: `${spec.sheets.length}개 시트 다운로드 완료` };
}
