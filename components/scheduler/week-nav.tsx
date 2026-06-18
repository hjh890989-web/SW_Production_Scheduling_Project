'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/** ISO 'YYYY-MM-DD'에 일수 가감(UTC 기준). */
function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 주차 이동 컨트롤 (성형·압출 공통). 선택한 날짜는 서버에서 그 주 월요일로 스냅된다.
 * basePath 예: '/molding' | '/extrusion'.
 */
export function WeekNav({ weekStart, basePath }: { weekStart: string; basePath: string }) {
  const router = useRouter();
  const go = (iso: string) => router.push(`${basePath}?week=${iso}`);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => go(shiftDays(weekStart, -7))} aria-label="이전 주">
        ◀ 이전 주
      </Button>
      <input
        type="date"
        value={weekStart}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="주차 선택"
      />
      <Button variant="outline" size="sm" onClick={() => go(shiftDays(weekStart, 7))} aria-label="다음 주">
        다음 주 ▶
      </Button>
    </div>
  );
}
