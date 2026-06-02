import type { DayLoad } from '@/lib/extrusion/load-balance';

/**
 * 부하 균형 그래프 (T6.5 — 커스텀 SVG, 신규 의존성 0). 일별 라인 가동률 막대 + 임계치 선.
 */
const COLORS: Record<string, string> = { FORD: '#2563eb', NEW: '#16a34a' };

export function LoadBalanceGraph({ days, extruderCodes }: { days: DayLoad[]; extruderCodes: string[] }) {
  if (days.length === 0) {
    return <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">부하 데이터가 없습니다.</p>;
  }

  const barW = 14;
  const gap = 6;
  const groupW = extruderCodes.length * barW + gap;
  const width = days.length * groupW + 40;
  const height = 140;
  const base = 110; // y of 0%
  const scale = 1; // 1% = 1px (max 100)

  return (
    <div className="overflow-x-auto rounded-md border p-3">
      <p className="mb-1 text-sm font-medium">라인 부하 균형 (가동률 %, 임계 95% / 균형 ≤10%차)</p>
      <svg width={width} height={height} role="img" aria-label="부하 균형 그래프">
        {/* 95% 임계선 */}
        <line x1={30} y1={base - 95 * scale} x2={width} y2={base - 95 * scale} stroke="#dc2626" strokeDasharray="4 3" />
        <text x={2} y={base - 95 * scale + 4} fontSize="9" fill="#dc2626">95</text>
        <line x1={30} y1={base} x2={width} y2={base} stroke="#9ca3af" />
        {days.map((d, di) => (
          <g key={d.date} transform={`translate(${40 + di * groupW}, 0)`}>
            {extruderCodes.map((code, ci) => {
              const pct = d.utilization[code] ?? 0;
              const h = pct * scale;
              const over = pct >= 95;
              return (
                <rect
                  key={code}
                  x={ci * barW}
                  y={base - h}
                  width={barW - 2}
                  height={h}
                  fill={over ? '#dc2626' : COLORS[code] ?? '#6b7280'}
                >
                  <title>{`${d.date} ${code}: ${pct}%${over ? ' (임계 초과)' : ''}`}</title>
                </rect>
              );
            })}
            <text x={0} y={base + 12} fontSize="9" fill="#374151">{d.date.slice(5)}</text>
            {!d.balanced && <text x={0} y={base + 22} fontSize="8" fill="#dc2626">차이 {d.maxDiff}%</text>}
          </g>
        ))}
      </svg>
      <ul className="mt-1 flex gap-3 text-xs">
        {extruderCodes.map((c) => (
          <li key={c} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ background: COLORS[c] ?? '#6b7280' }} />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
