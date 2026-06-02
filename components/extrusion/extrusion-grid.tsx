'use client';

import type { ExtGridModel, ExtCell } from '@/lib/extrusion/grid';
import { cellClass, statusBadge } from '@/lib/molding/cell-style';

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
}: {
  model: ExtGridModel;
  onMove?: (scheduleId: string, target: ExtMoveCoord, expectedUpdatedAt: string) => void;
}) {
  const byKey = new Map<string, ExtCell>();
  for (const c of model.cells) byKey.set(`${c.rowKey}|${c.colKey}`, c);
  const canDrag = !!onMove;

  return (
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
                return (
                  <td
                    key={col.key}
                    className="border p-0.5"
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
                        title={`${cell.productCode} · ${cell.quantity} · E${cell.extrusionGroup ?? '?'}/${cell.headPin ?? '?'}`}
                        className={`flex min-h-11 min-w-11 flex-col justify-center rounded px-1 py-1 text-center text-base ${canDrag ? 'cursor-move' : ''} ${cellClass(cell.status, cell.ruleViolation)}`}
                      >
                        <div className="font-mono text-sm">
                          {cell.productCode} {statusBadge(cell.status)}
                        </div>
                        <div>{cell.quantity}</div>
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
