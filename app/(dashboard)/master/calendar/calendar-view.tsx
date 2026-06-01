'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setCalendarDay } from '@/lib/master/calendar-actions';

export interface CalendarCell {
  dateKey: string;
  day: number;
  type: string;
  isWorkday: boolean;
  note: string | null;
}

const TYPE_STYLE: Record<string, string> = {
  NORMAL: 'bg-background',
  HOLIDAY: 'bg-red-100 text-red-800',
  PM: 'bg-amber-100 text-amber-800',
  TEMP_OFF: 'bg-gray-200 text-gray-600',
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NORMAL', label: '영업일' },
  { value: 'HOLIDAY', label: '공휴일' },
  { value: 'PM', label: 'PM(설비보전)' },
  { value: 'TEMP_OFF', label: '임시휴무' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarView({ cells, firstWeekday }: { cells: CalendarCell[]; firstWeekday: number }) {
  const [selected, setSelected] = useState<CalendarCell | null>(null);
  const [type, setType] = useState('NORMAL');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openDay(cell: CalendarCell) {
    setSelected(cell);
    setType(cell.type);
    setNote(cell.note ?? '');
    setMsg(null);
  }

  function save() {
    if (!selected) return;
    startTransition(async () => {
      const res = await setCalendarDay(selected.dateKey, type, note);
      setMsg(res.message);
      if (res.ok) setSelected(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 text-center text-sm font-semibold text-muted-foreground">
            {w}
          </div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {cells.map((cell) => (
          <button
            key={cell.dateKey}
            type="button"
            onClick={() => openDay(cell)}
            className={`flex min-h-16 flex-col rounded border p-2 text-left hover:ring-2 hover:ring-ring ${
              TYPE_STYLE[cell.type] ?? 'bg-background'
            }`}
          >
            <span className="text-base font-semibold">{cell.day}</span>
            {cell.note && <span className="truncate text-xs">{cell.note}</span>}
            {!cell.isWorkday && !cell.note && <span className="text-xs">휴무</span>}
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-semibold">{selected.dateKey}</h2>
            <label className="mb-1 block text-base font-medium" htmlFor="day-type">
              일자 유형
            </label>
            <select
              id="day-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mb-3 h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-base font-medium" htmlFor="day-note">
              비고
            </label>
            <Input id="day-note" value={note} onChange={(e) => setNote(e.target.value)} className="mb-2" />
            <p className="mb-3 text-sm text-muted-foreground">
              영업일 외(공휴일·PM·임시휴무)는 자동으로 비영업일 처리되어 스케줄러에서 제외됩니다.
            </p>
            {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                취소
              </Button>
              <Button disabled={pending} onClick={save}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
