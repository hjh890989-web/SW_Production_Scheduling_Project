'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { DAY_TYPES, isWeekend, type DayType } from '@/lib/master/calendar';

export interface ActionResult {
  ok: boolean;
  message: string;
}

function isDayType(v: string): v is DayType {
  return (DAY_TYPES as readonly string[]).includes(v);
}

/**
 * 캘린더 일자 설정 (T2.8 — setCalendarDay). master:write + AuditLog.
 * isWorkday는 type에서 자동 결정: NORMAL이면 평일만 true, 그 외(HOLIDAY/PM/TEMP_OFF)는 false.
 */
export async function setCalendarDay(
  dateKey: string,
  type: string,
  note: string,
): Promise<ActionResult> {
  const session = await auth();
  try {
    requirePermission(session?.user, 'master:write');
  } catch {
    return { ok: false, message: '수정 권한(master:write)이 없습니다.' };
  }

  if (!isDayType(type)) return { ok: false, message: `정의되지 않은 일자 유형: ${type}` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return { ok: false, message: '잘못된 날짜 형식입니다.' };

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const isWorkday = type === 'NORMAL' ? !isWeekend(date) : false;
  const trimmedNote = note.trim() || null;

  const before = await prisma.calendarDay.findUnique({ where: { date } });
  await prisma.calendarDay.upsert({
    where: { date },
    update: { type, isWorkday, note: trimmedNote },
    create: { date, type, isWorkday, note: trimmedNote },
  });

  await logAudit({
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    action: 'CALENDAR_UPDATED',
    table: 'CalendarDay',
    key: dateKey,
    before: before ? { type: before.type, isWorkday: before.isWorkday } : null,
    after: { type, isWorkday },
  });

  revalidatePath('/master/calendar');
  return { ok: true, message: '저장되었습니다.' };
}
