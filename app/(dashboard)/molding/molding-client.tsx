'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleGrid, type MoveTargetCoord } from '@/components/molding/schedule-grid';
import type { GridModel } from '@/lib/gantt/types';
import { generateMoldingScheduleAction } from '@/lib/scheduler/molding-actions';
import { moveMoldingSchedule } from '@/lib/scheduler/move-actions';
import type { StatusSummary } from '@/lib/molding/status-summary';

export function MoldingClient({
  weekStart,
  model,
  cellCount,
  violations = [],
  summary,
  highlightKeys = [],
  highlightItem,
}: {
  weekStart: string;
  model: GridModel;
  cellCount: number;
  violations?: string[];
  summary?: StatusSummary;
  highlightKeys?: string[];
  highlightItem?: string;
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

      {summary && summary.total > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded bg-gray-100 px-3 py-1 text-gray-700">자동 {summary.AUTO}</span>
          <span className="rounded border border-blue-500 bg-blue-50 px-3 py-1 text-blue-800">수동 {summary.MANUAL}</span>
          <span className="rounded border border-green-500 bg-green-50 px-3 py-1 text-green-800">확정 {summary.CONFIRMED}</span>
          {summary.ruleViolations > 0 && (
            <span className="rounded bg-red-100 px-3 py-1 text-red-700">위반 {summary.ruleViolations}</span>
          )}
        </div>
      )}

      {msg && (
        <p className={`mb-3 rounded-md p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} role="alert">
          {msg.text}
        </p>
      )}

      {violations.length > 0 && (
        <div className="mb-3 rounded-md border-2 border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <p className="font-semibold">⚠️ 위치 제약(O/X) 위반 {violations.length}건 — 차단하지 않으며 확인이 필요합니다.</p>
          <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">
            {violations.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {model.rows.length === 0 ? (
        <p className="rounded border border-dashed p-8 text-center text-muted-foreground">
          성형 장비 시드가 필요합니다. (npx prisma db seed)
        </p>
      ) : (
        <>
          {highlightItem && (
            <p className="mb-2 rounded-md bg-yellow-50 p-2 text-sm text-yellow-800" role="status">
              영향 하이라이트: <b>{highlightItem}</b> — {highlightKeys.length}셀 표시{highlightKeys.length > 50 ? ' (상위 50, 요약)' : ''}
            </p>
          )}
          <ScheduleGrid model={model} onMove={onMove} highlightKeys={highlightKeys.slice(0, 50)} />
        </>
      )}
    </main>
  );
}
