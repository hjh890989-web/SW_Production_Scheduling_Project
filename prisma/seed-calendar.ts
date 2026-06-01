import type { PrismaClient } from '@prisma/client';
import { buildCalendarDays } from '../lib/master/calendar';

/** 2026~2027 캘린더 시드 (T2.4). date PK 멱등 upsert. 반환: 적재 건수. */
export async function seedCalendar(prisma: PrismaClient): Promise<number> {
  const days = buildCalendarDays(2026, 2027);
  for (const d of days) {
    await prisma.calendarDay.upsert({
      where: { date: d.date },
      update: { type: d.type, isWorkday: d.isWorkday, note: d.note },
      create: { date: d.date, type: d.type, isWorkday: d.isWorkday, note: d.note },
    });
  }
  return days.length;
}
