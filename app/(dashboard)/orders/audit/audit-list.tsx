'use client';

import { Button } from '@/components/ui/button';

export interface AuditRow {
  id: string;
  timestamp: string;
  userId: string | null;
  userRole: string | null;
  action: string;
  targetTable: string | null;
  targetKey: string | null;
  before: string | null;
  after: string | null;
}

function toCsv(rows: AuditRow[]): string {
  const header = ['timestamp', 'userId', 'userRole', 'action', 'targetTable', 'targetKey', 'before', 'after'];
  const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.timestamp, r.userId, r.userRole, r.action, r.targetTable, r.targetKey, r.before, r.after].map(esc).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export function AuditList({ rows }: { rows: AuditRow[] }) {
  function exportCsv() {
    const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rows.length}건</span>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          CSV 다운로드
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.length === 0 && <li className="rounded border border-dashed p-6 text-center text-muted-foreground">이력이 없습니다.</li>}
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{r.timestamp.slice(0, 19).replace('T', ' ')}</span>
              <span className="rounded bg-muted px-2 py-0.5 font-medium">{r.action}</span>
              {r.targetTable && <span className="text-muted-foreground">{r.targetTable}/{r.targetKey ?? ''}</span>}
              <span className="ml-auto text-xs text-muted-foreground">{r.userRole ?? ''} {r.userId ?? ''}</span>
            </div>
            {(r.before || r.after) && (
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <pre className="overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-800">{r.before ?? '—'}</pre>
                <pre className="overflow-x-auto rounded bg-green-50 p-2 text-xs text-green-800">{r.after ?? '—'}</pre>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
