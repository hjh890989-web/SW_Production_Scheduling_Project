import { compareBeforeAfter, type BeforeAfterMetric } from '@/lib/ksf/before-after';
import { ksfPercent } from '@/lib/ksf/format';

/**
 * T12.5.3 도입 前後 비교 — 모바일 카드. 지표별 도입 전→후 + 개선폭(%p).
 */
export function BeforeAfter({ metrics }: { metrics: BeforeAfterMetric[] }) {
  const rows = compareBeforeAfter(metrics);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <section key={r.key} className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{r.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl text-gray-500">{ksfPercent(r.before)}</span>
            <span className="text-gray-400">→</span>
            <span className="text-3xl font-bold">{ksfPercent(r.after)}</span>
            {r.deltaPct !== null && (
              <span className={`ml-auto text-base font-semibold ${r.improved ? 'text-green-600' : 'text-red-600'}`}>
                {r.improved ? '▲' : '▼'} {Math.abs(r.deltaPct)}%p
              </span>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
