'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExtrusionGrid } from '@/components/extrusion/extrusion-grid';
import type { ExtGridModel } from '@/lib/extrusion/grid';
import { generateExtrusionScheduleAction } from '@/lib/extrusion/extrusion-actions';

export function ExtrusionClient({
  weekStart,
  model,
  cellCount,
}: {
  weekStart: string;
  model: ExtGridModel;
  cellCount: number;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setMsg(null);
    startTransition(async () => {
      const res = await generateExtrusionScheduleAction(weekStart);
      setMsg({ text: res.message, ok: res.ok });
      if (res.ok) router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">압출 스케줄 (W-5)</h1>
          <p className="mt-1 text-base text-muted-foreground">
            주간 시작 {weekStart} · 관체 요청 기반 자동 배치 {cellCount}셀. (E그룹·헤드핀 묶음으로 다이/노즐 변경 최소화)
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
          압출기 시드가 필요합니다. (npx prisma db seed)
        </p>
      ) : (
        <ExtrusionGrid model={model} />
      )}
    </main>
  );
}
