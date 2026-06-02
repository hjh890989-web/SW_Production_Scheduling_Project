'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleGrid } from '@/components/molding/schedule-grid';
import type { GridModel } from '@/lib/gantt/types';
import { generateMoldingScheduleAction } from '@/lib/scheduler/molding-actions';

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

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">성형 스케줄 (W-4)</h1>
          <p className="mt-1 text-base text-muted-foreground">
            주간 시작 {weekStart} · 자동 백워드(D-2) 초안 {cellCount}셀. 자동=회색 / 수동=파랑 / 확정=초록.
          </p>
        </div>
        <Button onClick={generate} disabled={pending} className="h-11 text-base">
          {pending ? '생성 중…' : '자동 스케줄 생성'}
        </Button>
      </header>

      {msg && (
        <p className={`mb-3 rounded-md p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {model.rows.length === 0 ? (
        <p className="rounded border border-dashed p-8 text-center text-muted-foreground">
          성형 장비 시드가 필요합니다. (npx prisma db seed)
        </p>
      ) : (
        <ScheduleGrid model={model} />
      )}
    </main>
  );
}
