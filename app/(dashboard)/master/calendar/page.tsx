import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { toDateKey } from '@/lib/master/calendar';
import { CalendarView, type CalendarCell } from './calendar-view';

export const metadata: Metadata = { title: '캘린더 · EVS' };
export const dynamic = 'force-dynamic';

// 시드 범위 2026~2027로 클램프
function clamp(year: number, month: number): { year: number; month: number } {
  let y = year;
  let m = month;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  if (y < 2026) return { year: 2026, month: 1 };
  if (y > 2027) return { year: 2027, month: 12 };
  return { year: y, month: m };
}

export default async function CalendarMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams; // Next 16: searchParams는 async
  const { year, month } = clamp(
    Number(sp.year) || 2026,
    Number(sp.month) || 6,
  );

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const days = await prisma.calendarDay.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    orderBy: { date: 'asc' },
  });

  const cells: CalendarCell[] = days.map((d) => ({
    dateKey: toDateKey(d.date),
    day: d.date.getUTCDate(),
    type: d.type,
    isWorkday: d.isWorkday,
    note: d.note,
  }));

  const firstWeekday = monthStart.getUTCDay(); // 0=일
  const prev = clamp(year, month - 1);
  const next = clamp(year, month + 1);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">캘린더 (W-7)</h1>
          <p className="mt-1 text-base text-muted-foreground">영업일·공휴일·PM·임시휴무 관리. 일자를 클릭해 변경합니다.</p>
        </div>
        <div className="flex items-center gap-2 text-base">
          <Link className="rounded border px-3 py-1 hover:bg-muted" href={`/master/calendar?year=${prev.year}&month=${prev.month}`}>
            ◀
          </Link>
          <span className="min-w-28 text-center font-semibold">
            {year}년 {month}월
          </span>
          <Link className="rounded border px-3 py-1 hover:bg-muted" href={`/master/calendar?year=${next.year}&month=${next.month}`}>
            ▶
          </Link>
        </div>
      </header>
      <CalendarView cells={cells} firstWeekday={firstWeekday} />
    </main>
  );
}
