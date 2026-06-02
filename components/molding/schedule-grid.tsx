'use client';

import type { GridModel, GridCell } from '@/lib/gantt/types';
import { cellClass, statusBadge, SCHEDULE_LEGEND } from '@/lib/molding/cell-style';

/**
 * W-4 슬롯 그리드 (T5.1 커스텀 그리드, CORE-1). 행=가류기·슬롯, 열=영업일·주야.
 * 색상 코딩 lib/molding/cell-style(T5.5). 드래그/툴팁은 T5.6/T5.9.
 */
export function ScheduleGrid({ model }: { model: GridModel }) {
  const cellByKey = new Map<string, GridCell>();
  for (const c of model.cells) cellByKey.set(`${c.rowKey}|${c.colKey}`, c);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-3 text-sm" aria-label="범례">
        {SCHEDULE_LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1">
            <span className={`inline-block h-4 w-6 rounded ${l.className}`} />
            {l.label}
          </li>
        ))}
      </ul>

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
                        <div className={`min-h-11 rounded px-1 py-1 text-center text-sm ${cellClass(cell.status, cell.ruleViolation)}`}>
                          <div className="font-mono text-xs">
                            {cell.productCode} {statusBadge(cell.status)}
                          </div>
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
    </div>
  );
}
