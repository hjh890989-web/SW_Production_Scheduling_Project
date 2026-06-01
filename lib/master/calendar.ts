/**
 * 캘린더 생성 (T2.4 — F-1.4, R-10).
 * CORE-1: DayType은 String. CORE-4: 한국 공휴일(음력 포함)은 2026~2027 수동 매핑.
 */
export const DAY_TYPES = ['NORMAL', 'HOLIDAY', 'PM', 'TEMP_OFF'] as const;
export type DayType = (typeof DAY_TYPES)[number];

/**
 * 한국 공휴일 수동 매핑 (CORE-4). 음력(설날·추석·석가탄신일)은 연도별 직접 지정.
 * 연장 시 재검증 필요. 대체공휴일은 미포함(향후 보강).
 */
export const KOREAN_HOLIDAYS: Record<string, string> = {
  // 2026
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
  // 2027
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-09': '한글날',
  '2027-12-25': '성탄절',
};

/** UTC 기준 'YYYY-MM-DD'. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export interface CalendarDayInput {
  date: Date;
  type: DayType;
  isWorkday: boolean;
  note: string | null;
}

/**
 * [startYear-01-01, endYear-12-31] 캘린더 생성.
 * 주말·공휴일은 isWorkday=false, 공휴일은 type=HOLIDAY.
 */
export function buildCalendarDays(startYear: number, endYear: number): CalendarDayInput[] {
  const days: CalendarDayInput[] = [];
  const cursor = new Date(Date.UTC(startYear, 0, 1));
  const end = new Date(Date.UTC(endYear, 11, 31));

  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor);
    const holiday = KOREAN_HOLIDAYS[key];
    const weekend = isWeekend(cursor);
    days.push({
      date: new Date(cursor.getTime()),
      type: holiday ? 'HOLIDAY' : 'NORMAL',
      isWorkday: !holiday && !weekend,
      note: holiday ?? null,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
