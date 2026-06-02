'use client';

import type { GridModel, GridCell } from '@/lib/gantt/types';

/**
 * W-4 슬롯 그리드 (T5.1 커스텀 그리드, CORE-1). 행=가류기·슬롯, 열=영업일·주야.
 * 색상/드래그/툴팁은 T5.5~T5.9에서 확장. 베테랑 친화 16px+.
 */
const STATUS_STYLE: Record<string, string> = {
  AUTO: 'bg-gray-100 text-gray-700',
  MANUAL: 'border-2 border-blue-500 bg-blue-50 text-blue-800',
  CONFIRMED: 'border-2 border-green-500 bg-green-50 text-green-800',
};

export function ScheduleGrid({ model }: { model: GridModel }) {
  const cellByKey = new Map<string, GridCell>();
  for (const c of model.cells) cellByKey.set(`${c.rowKey}|${c.colKey}`, c);

  return (
    <div className="overflow-auto rounded-md border">
      <table className="border-collapse text-base">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border bg-muted px-3 py-2 text-left font-semibold">가류기 / 슬롯</th>
            {model.columns.map((col) => (
              <th
                key={col.key}
                className={`min-w-16 border px-2 py-2 text-center text-sm font-medium ${col.isWorkday ? '' : 'bg-red-50 text-red-700'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => (
            <tr key={row.key}>
              <th className="sticky left-0 z-10 border bg-background px-3 py-2 text-left font-medium">
                {row.equipmentCode} · {row.slot}
              </th>
              {model.columns.map((col) => {
                const cell = cellByKey.get(`${row.key}|${col.key}`);
                return (
                  <td key={col.key} className="border p-0.5">
                    {cell && (
                      <div className={`min-h-11 rounded px-1 py-1 text-center text-sm ${STATUS_STYLE[cell.status] ?? ''}`}>
                        <div className="font-mono text-xs">{cell.productCode}</div>
                        <div>{cell.rotations}회</div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
