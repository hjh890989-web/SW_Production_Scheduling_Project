'use client';

import { useState, useTransition } from 'react';
import { deleteUploadBatch } from '@/lib/orders/batch-actions';

export interface BatchRow {
  batchId: string;
  sourceType: string;
  count: number;
  quantity: number;
  uploadedAt: string; // ISO
}

const SOURCE_LABEL: Record<string, string> = {
  weekly_plan: '주간 계획',
  kd: 'KD 발주',
  monthly_forecast: '월예상/통합',
};

export function UploadBatches({ batches }: { batches: BatchRow[] }) {
  const [rows, setRows] = useState(batches);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) return null;

  function remove(b: BatchRow) {
    const label = SOURCE_LABEL[b.sourceType] ?? b.sourceType;
    if (!window.confirm(`이 업로드를 되돌립니다(완전 삭제).\n\n${label} · ${b.count}건\n업로드: ${b.uploadedAt.replace('T', ' ').slice(0, 16)}\n\n삭제하면 복구할 수 없습니다. 계속할까요?`)) {
      return;
    }
    setMsg(null);
    setBusyId(b.batchId);
    startTransition(async () => {
      const res = await deleteUploadBatch(b.batchId);
      setBusyId(null);
      setMsg(res.message);
      if (res.ok) setRows((prev) => prev.filter((r) => r.batchId !== b.batchId));
    });
  }

  return (
    <details className="mb-4 rounded-md border">
      <summary className="cursor-pointer select-none p-3 text-sm font-medium">
        최근 업로드 ({rows.length}) — 잘못 올렸다면 되돌리기
      </summary>
      <div className="border-t p-3">
        {msg && <p className="mb-2 rounded bg-muted p-2 text-sm">{msg}</p>}
        <ul className="flex flex-col gap-2">
          {rows.map((b) => (
            <li key={b.batchId} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {SOURCE_LABEL[b.sourceType] ?? b.sourceType}
                </span>
                <span>{b.count.toLocaleString()}건</span>
                <span className="text-muted-foreground">수량 {b.quantity.toLocaleString()}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {b.uploadedAt.replace('T', ' ').slice(0, 16)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(b)}
                disabled={pending && busyId === b.batchId}
                className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {pending && busyId === b.batchId ? '삭제 중…' : '되돌리기'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
