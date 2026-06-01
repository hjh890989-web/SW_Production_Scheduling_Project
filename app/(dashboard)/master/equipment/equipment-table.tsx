'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toggleEquipmentActive, updateEquipmentName } from '@/lib/master/equipment-actions';

export interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  type: string;
  slotCount: number;
  isActive: boolean;
  updatedAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  MOLDING_LP: '저압가류기',
  MOLDING_IC: 'IC가류기',
  EXTRUSION: '압출기',
};

function EquipmentRowItem({ row }: { row: EquipmentRow }) {
  const [name, setName] = useState(row.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveName() {
    if (name.trim() === row.name) return;
    startTransition(async () => {
      const res = await updateEquipmentName(row.id, name, row.updatedAt);
      setMsg(res.ok ? null : res.message);
    });
  }

  function doToggle() {
    setConfirmOff(false);
    startTransition(async () => {
      const res = await toggleEquipmentActive(row.id, row.updatedAt);
      setMsg(res.ok ? null : res.message);
    });
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-mono">{row.code}</td>
      <td className="px-3 py-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} disabled={pending} />
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </td>
      <td className="px-3 py-2">{TYPE_LABEL[row.type] ?? row.type}</td>
      <td className="px-3 py-2 text-center">{row.slotCount}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {row.isActive ? '가동' : '비가동'}
        </span>
      </td>
      <td className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => (row.isActive ? setConfirmOff(true) : doToggle())}
        >
          {row.isActive ? '비가동' : '가동'} 전환
        </Button>
        {confirmOff && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setConfirmOff(false)}
          >
            <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 text-lg font-semibold">비가동 전환 확인</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {row.code}를 비가동으로 전환하면 향후 스케줄러에서 제외됩니다. 진행 중인 작업이 있으면 영향을 받을 수 있습니다(스케줄 연동은 Sprint 5).
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOff(false)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={doToggle}>
                  비가동 전환
                </Button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export function EquipmentTable({ rows }: { rows: EquipmentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-base">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">코드</th>
            <th className="px-3 py-2 text-left font-semibold">이름</th>
            <th className="px-3 py-2 text-left font-semibold">종류</th>
            <th className="px-3 py-2 text-center font-semibold">슬롯/라인</th>
            <th className="px-3 py-2 text-left font-semibold">상태</th>
            <th className="px-3 py-2 text-left font-semibold">작업</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <EquipmentRowItem key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
