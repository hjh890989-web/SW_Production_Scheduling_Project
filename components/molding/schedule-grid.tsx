'use client';

import type { GridModel, GridCell, DayNight } from '@/lib/gantt/types';
import { cellClass, statusBadge, SCHEDULE_LEGEND } from '@/lib/molding/cell-style';
import { explainCell } from '@/lib/molding/cell-tooltip';

export interface MoveTargetCoord {
  equipmentCode: string;
  slot: string;
  date: string;
  daynight: DayNight;
}

/**
 * W-4 슬롯 그리드 (T5.1 커스텀 그리드, CORE-1). 행=가류기·슬롯, 열=영업일·주야.
 * 색상 코딩 lib/molding/cell-style(T5.5). onMove 제공 시 드래그 재배분(T5.6 J-MR-2).
 */
export function ScheduleGrid({
  model,
  onMove,
  highlightKeys,
}: {
  model: GridModel;
  onMove?: (scheduleId: string, target: MoveTargetCoord, expectedUpdatedAt: string) => void;
  highlightKeys?: string[];
}) {
  const cellByKey = new Map<string, GridCell>();
  for (const c of model.cells) cellByKey.set(`${c.rowKey}|${c.colKey}`, c);
  const canDrag = !!onMove;
  const highlight = new Set(highlightKeys ?? []);

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
                              if (id && onMove) {
                                onMove(id, { equipmentCode: row.equipmentCode, slot: row.slot, date: col.date, daynight: col.daynight }, updatedAt);
                              }
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
                          title={explainCell(cell)}
                          className={`flex min-h-11 min-w-11 flex-col justify-center rounded px-1 py-1 text-center text-base ${canDrag ? 'cursor-move' : ''} ${cellClass(cell.status, cell.ruleViolation)}`}
                        >
                          <div className="font-mono text-sm">
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
