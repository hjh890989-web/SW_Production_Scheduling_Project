'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getScheduleExportRows } from '@/lib/export/export-actions';
import { downloadScheduleExcel } from '@/lib/export/excel-client';

/**
 * T8.1 — W-4/W-5 엑셀 다운로드 버튼. 서버에서 RBAC 검증 후 행을 받아 클라이언트에서 .xlsx 생성.
 * 데이터 0건이면 "데이터 없음" 안내만 표시(다운로드 X, AC T8.1-F1).
 */
export function ExcelDownloadButton({ weekStart }: { weekStart: string }) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await getScheduleExportRows(weekStart);
      if (!res.ok) {
        setMsg({ text: res.message, ok: false });
        return;
      }
      const result = downloadScheduleExcel(res.molding, res.extrusion, `스케줄_${weekStart}.xlsx`);
      setMsg({ text: result.message, ok: result.ok });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={pending} variant="outline" className="h-11 text-base">
        {pending ? '내보내는 중…' : '엑셀 다운로드'}
      </Button>
      {msg && (
        <span className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`} role="status">
          {msg.text}
        </span>
      )}
    </div>
  );
}
