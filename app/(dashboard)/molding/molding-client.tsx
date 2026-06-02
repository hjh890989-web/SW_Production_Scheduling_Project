'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleGrid, type MoveTargetCoord } from '@/components/molding/schedule-grid';
import type { GridModel } from '@/lib/gantt/types';
import { generateMoldingScheduleAction } from '@/lib/scheduler/molding-actions';
import { moveMoldingSchedule } from '@/lib/scheduler/move-actions';

export function MoldingClient({
  weekStart,
  model,
  cellCount,
}: {
  weekStart: string;
  model: GridModel;
  cellCount: number;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setMsg(null);
    startTransition(async () => {
      const res = await generateMoldingScheduleAction(weekStart);
      setMsg({ text: res.message, ok: res.ok });
      if (res.ok) router.refresh();
    });
  }

  function onMove(scheduleId: string, target: MoveTargetCoord, expectedUpdatedAt: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await moveMoldingSchedule(scheduleId, target, expectedUpdatedAt);
      // 룰 위반은 빨간 토스트 경고이지만 배치는 성공(차단 X)
      setMsg({ text: res.message, ok: res.ok && !res.ruleViolation });
      if (res.ok) router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">성형 스케줄 (W-4)</h1>
          <p className="mt-1 text-base text-muted-foreground">
            주간 시작 {weekStart} · 자동 백워드(D-2) 초안 {cellCount}셀. 셀을 드래그해 가류기·일자를 재배분합니다(자동→수동).
          </p>
        </div>
        <Button onClick={generate} disabled={pending} className="h-11 text-base">
          {pending ? '생성 중…' : '자동 스케줄 생성'}
        </Button>
      </header>

      {msg && (
        <p className={`mb-3 rounded-md p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} role="alert">
          {msg.text}
        </p>
      )}

      {model.rows.length === 0 ? (
        <p className="rounded border border-dashed p-8 text-center text-muted-foreground">
          성형 장비 시드가 필요합니다. (npx prisma db seed)
        </p>
      ) : (
        <ScheduleGrid model={model} onMove={onMove} />
      )}
    </main>
  );
}
