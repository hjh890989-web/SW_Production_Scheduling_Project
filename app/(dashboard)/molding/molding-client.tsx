'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScheduleGrid, type MoveTargetCoord } from '@/components/molding/schedule-grid';
import { ExcelDownloadButton } from '@/components/export/excel-download-button';
import { AlgorithmToggle } from '@/components/scheduler/algorithm-toggle';
import { WeekNav } from '@/components/scheduler/week-nav';
import { toggleAlgorithm, type Algorithm } from '@/lib/scheduler/algorithm-toggle';
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
  const [genWarnings, setGenWarnings] = useState<{ productCode: string; deliveryDate: string; reason: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const [algo, setAlgo] = useState<Algorithm>('rule');

  function generate() {
    setMsg(null);
    setGenWarnings([]);
    startTransition(async () => {
      const res = await generateMoldingScheduleAction(weekStart, algo);
      setMsg({ text: res.message, ok: res.ok });
      setGenWarnings(res.warningDetails ?? []);
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
        <div className="flex items-start gap-2">
          <WeekNav weekStart={weekStart} basePath="/molding" />
          <Button onClick={generate} disabled={pending} className="h-11 text-base">
            {pending ? '생성 중…' : '자동 스케줄 생성'}
          </Button>
          <ExcelDownloadButton weekStart={weekStart} />
          <AlgorithmToggle algo={algo} onToggle={() => setAlgo(toggleAlgorithm(algo))} />
        </div>
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

      {genWarnings.length > 0 && (
        <details className="mb-3 rounded-md border border-amber-300 bg-amber-50" open>
          <summary className="cursor-pointer p-3 text-sm font-semibold text-amber-800">
            ⚠️ 미배치/부분배치 경고 {genWarnings.length}건 — 품번별 사유 (클릭해 접기)
          </summary>
          <div className="border-t border-amber-200 p-3">
            <ul className="mb-2 flex flex-wrap gap-2 text-xs">
              {Object.entries(
                genWarnings.reduce<Record<string, number>>((acc, w) => {
                  acc[w.reason] = (acc[w.reason] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([reason, n]) => (
                <li key={reason} className="rounded bg-amber-100 px-2 py-1 text-amber-800">
                  {reason}: {n}건
                </li>
              ))}
            </ul>
            <ul className="max-h-60 overflow-y-auto text-sm">
              {genWarnings.map((w, i) => (
                <li key={`${w.productCode}-${i}`} className="flex flex-wrap gap-x-3 border-t border-amber-100 py-1 first:border-t-0">
                  <span className="font-mono">{w.productCode}</span>
                  {w.deliveryDate && <span className="text-muted-foreground">납기 {w.deliveryDate}</span>}
                  <span className="text-amber-800">{w.reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              대부분 품번 마스터의 성형 제약(앵글당 금형수·LP상단) 미설정이 원인입니다. 품번 마스터에서 값을 채운 뒤 다시 생성하세요.
            </p>
          </div>
        </details>
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
