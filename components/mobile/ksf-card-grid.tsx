import { ksfPercent, ksfTrend, TREND_MARK, type Trend } from '@/lib/ksf/format';

/**
 * T12.5.2 모바일 KSF 카드 그리드 — 모바일 우선(2열), 큰 글씨·터치 친화. 표시 전용.
 */
export interface KsfCard {
  key: string;
  label: string;
  value: number | null;
  prev: number | null;
}

const TREND_CLASS: Record<Trend, string> = {
  up: 'text-green-600',
  down: 'text-red-600',
  flat: 'text-gray-500',
  none: 'text-gray-400',
};

export function KsfCardGrid({ cards }: { cards: KsfCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const trend = ksfTrend(c.value, c.prev);
        return (
          <section key={c.key} className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{ksfPercent(c.value)}</p>
            <p className={`mt-1 text-sm font-medium ${TREND_CLASS[trend]}`}>
              {TREND_MARK[trend]} {trend === 'none' ? '데이터 부족' : '전일 대비'}
            </p>
          </section>
        );
      })}
    </div>
  );
}
