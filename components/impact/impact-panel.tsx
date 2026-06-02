'use client';

import { useEffect, useState } from 'react';
import { simulateOrderChangeImpact, type ImpactPanelResult } from '@/lib/impact/impact-actions';

const SEV_LABEL: Record<string, string> = {
  critical: '🔴 진행중(현장 확인)',
  warning: '🟡 확정(재계산 가능)',
  auto: '🟢 자동(재계산)',
  unknown: '⚪ 미정',
};

/**
 * W-3 영향 시뮬 패널 (T7.2 — AC PM-1-1). 품번 입력 시 debounce 500ms로 시뮬.
 */
export function ImpactPanel({ productCode, changeType }: { productCode?: string; changeType?: string }) {
  const [result, setResult] = useState<ImpactPanelResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = (productCode ?? '').trim();
    if (code.length < 3) {
      setResult(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await simulateOrderChangeImpact(code, changeType ?? '수량');
      setResult(r);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [productCode, changeType]);

  if (loading) {
    return <div className="mt-2 h-20 animate-pulse rounded-md border bg-muted/40" aria-label="시뮬레이션 중" />;
  }
  if (!result) return null;
  if (!result.ok) {
    return <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800">{result.message}</p>;
  }

  const counts = result.counts ?? { critical: 0, warning: 0, auto: 0, unknown: 0 };
  return (
    <div className="mt-2 rounded-md border p-3">
      <p className="text-sm font-semibold">영향 시뮬레이션: 진행/예정 {result.total}건</p>
      <ul className="mt-1 flex flex-wrap gap-2 text-sm">
        <li className="rounded bg-red-100 px-2 py-0.5 text-red-800">{SEV_LABEL.critical} {counts.critical}</li>
        <li className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">{SEV_LABEL.warning} {counts.warning}</li>
        <li className="rounded bg-green-100 px-2 py-0.5 text-green-800">{SEV_LABEL.auto} {counts.auto}</li>
      </ul>
      {result.degraded && <p className="mt-1 text-xs text-amber-700">⚠️ Degraded Mode — DB 기준(MES 미연동)</p>}
      {result.total === 0 && <p className="mt-1 text-sm text-muted-foreground">영향받는 스케줄이 없습니다(또는 아직 스케줄 미생성).</p>}
    </div>
  );
}
