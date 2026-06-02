'use client';

import * as XLSX from 'xlsx';
import {
  buildWorkbookSpec,
  type MoldingExportRow,
  type ExtrusionExportRow,
} from './excel-exporter';

export interface DownloadResult {
  ok: boolean;
  message: string;
}

/**
 * T8.1 — 성형·압출 스케줄을 .xlsx로 클라이언트 다운로드 (기존 xlsx 재사용, CORE-1).
 * 데이터 0건이면 다운로드하지 않고 "데이터 없음" 반환 (AC T8.1-F1).
 */
export function downloadScheduleExcel(
  molding: MoldingExportRow[],
  extrusion: ExtrusionExportRow[],
  filename: string,
): DownloadResult {
  const spec = buildWorkbookSpec(molding, extrusion);
  if (spec.isEmpty) {
    return { ok: false, message: '데이터 없음 — 내보낼 스케줄이 없습니다.' };
  }
  const wb = XLSX.utils.book_new();
  for (const sheet of spec.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, filename);
  return { ok: true, message: `${spec.sheets.length}개 시트 다운로드 완료` };
}
