'use client';

import type { ExtGridModel, ExtCell } from '@/lib/extrusion/grid';
import { cellClass, statusBadge } from '@/lib/molding/cell-style';
import { egroupColor, egroupLabel, EGROUP_LEGEND } from '@/lib/extrusion/egroup-color';

export interface ExtMoveCoord {
  extruderCode: string;
  shift: string;
  date: string;
}

/**
 * W-5 압출 그리드 (T6.2, 커스텀). 행=압출기·근무, 열=일자.
 * onMove 제공 시 드래그 재배분(T6.6). E그룹 색상은 T6.3에서 확장.
 */
export function ExtrusionGrid({
  model,
  onMove,
  highlightKeys,
}: {
  model: ExtGridModel;
  onMove?: (scheduleId: string, target: ExtMoveCoord, expectedUpdatedAt: string) => void;
  highlightKeys?: string[];
}) {
  const byKey = new Map<string, ExtCell>();
  for (const c of model.cells) byKey.set(`${c.rowKey}|${c.colKey}`, c);
  const canDrag = !!onMove;
  const highlight = new Set(highlightKeys ?? []);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2 text-sm" aria-label="E그룹 범례">
        {EGROUP_LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1">
            <span className={`inline-block h-4 w-5 rounded ${l.className}`} />
            {l.label}
          </li>
        ))}
      </ul>
      <div className="overflow-auto rounded-md border">
      <table className="border-collapse text-base">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border bg-muted px-3 py-2 text-left font-semibold">압출기 / 근무</th>
            {model.columns.map((col) => (
              <th key={col.key} className={`min-w-20 border px-2 py-2 text-center text-sm font-medium ${col.isWorkday ? '' : 'bg-red-50 text-red-700'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => (
            <tr key={row.key}>
              <th className="sticky left-0 z-10 border bg-background px-3 py-2 text-left text-sm font-medium">{row.label}</th>
              {model.columns.map((col) => {
                const cell = byKey.get(`${row.key}|${col.key}`);
                const isHi = highlight.has(`${row.key}|${col.key}`);
                return (
                  <td
                    key={col.key}
                    className={`border p-0.5 ${isHi ? 'bg-yellow-200 ring-2 ring-yellow-500' : ''}`}
                    onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
                    onDrop={
                      canDrag
                        ? (e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData('scheduleId');
                            const updatedAt = e.dataTransfer.getData('updatedAt');
                            if (id && onMove) onMove(id, { extruderCode: row.extruderCode, shift: row.shift, date: col.date }, updatedAt);
                          }
                        : undefined
                    }
                  >
                    {cell && (
                      <div
                        draggable={canDrag && !!cell.scheduleId}
                        onDragStart={
                          canDrag && cell.scheduleId
                            ? (e) => {
                                e.dataTransfer.setData('scheduleId', cell.scheduleId as string);
                                e.dataTransfer.setData('updatedAt', cell.updatedAt ?? '');
                              }
                            : undefined
                        }
                        title={`${cell.productCode} · ${cell.quantity} · ${egroupLabel(cell.extrusionGroup)}/${cell.headPin ?? '?'}`}
                        className={`flex min-h-11 min-w-11 flex-col justify-center rounded border-l-4 px-1 py-1 text-center text-base ${canDrag ? 'cursor-move' : ''} ${egroupColor(cell.extrusionGroup)} ${cell.status !== 'AUTO' ? cellClass(cell.status, cell.ruleViolation) : ''} ${cell.ruleViolation ? 'ring-2 ring-red-500' : ''}`}
                      >
                        <div className="font-mono text-sm">
                          {cell.productCode} {statusBadge(cell.status)}
                        </div>
                        <div className="text-xs">{egroupLabel(cell.extrusionGroup)} · {cell.quantity}</div>
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
