'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateOperationParam } from '@/lib/master/param-actions';

export interface ParamRow {
  key: string;
  label: string;
  category: string;
  min: number;
  max: number;
  value: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  molding: '성형',
  extrusion: '압출',
  rule: '룰',
};

function ParamRowItem({ row }: { row: ParamRow }) {
  const [value, setValue] = useState(row.value);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(override = false) {
    startTransition(async () => {
      const res = await updateOperationParam(row.key, value, override);
      if (res.needsConfirm) {
        setConfirm(res.message);
        return;
      }
      setConfirm(null);
      setMsg({ text: res.message, ok: res.ok });
    });
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2">{row.label}</td>
      <td className="px-3 py-2 text-muted-foreground">{CATEGORY_LABEL[row.category] ?? row.category}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {row.min}~{row.max}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-28"
            aria-label={row.label}
          />
          <Button size="sm" disabled={pending} onClick={() => save(false)}>
            저장
          </Button>
        </div>
        {msg && <span className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
        {confirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setConfirm(null)}
          >
            <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 text-lg font-semibold">범위 초과 확인</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {row.label}: {confirm}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={() => save(true)}>
                  그래도 적용
                </Button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export function ParamsTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-base">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">파라미터</th>
            <th className="px-3 py-2 text-left font-semibold">분류</th>
            <th className="px-3 py-2 text-left font-semibold">범위</th>
            <th className="px-3 py-2 text-left font-semibold">값</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ParamRowItem key={r.key} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
