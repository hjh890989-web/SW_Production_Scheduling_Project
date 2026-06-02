'use client';

import { Button } from '@/components/ui/button';
import type { QuarterlyReport, SnapshotInput } from '@/lib/export/quarterly-report';

/** % 표기(0~1 비율 → 정수 %). null은 '—'. */
function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function deltaLabel(v: number | null): { text: string; cls: string } {
  if (v === null) return { text: '—', cls: 'text-gray-500' };
  const p = Math.round(v * 100);
  if (p > 0) return { text: `▲ ${p}%p`, cls: 'text-green-700' };
  if (p < 0) return { text: `▼ ${Math.abs(p)}%p`, cls: 'text-red-700' };
  return { text: '0%p', cls: 'text-gray-500' };
}

/** KSF-1 시계열 라인 차트 — 커스텀 SVG(신규 의존성 0). */
function TrendChart({ series, adoptionDate }: { series: SnapshotInput[]; adoptionDate: string }) {
  const pts = series.filter((s) => s.ksf1Punctuality !== null);
  if (pts.length === 0) {
    return <p className="text-base text-gray-500">납기율 시계열 데이터가 없습니다.</p>;
  }
  const width = 560;
  const height = 160;
  const pad = 30;
  const n = pts.length;
  const x = (i: number) => pad + (n === 1 ? (width - 2 * pad) / 2 : (i * (width - 2 * pad)) / (n - 1));
  const y = (v: number) => height - pad - v * (height - 2 * pad);
  const path = pts.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.ksf1Punctuality!)}`).join(' ');
  const adoptIdx = pts.findIndex((s) => s.date >= adoptionDate);

  return (
    <svg width={width} height={height} role="img" aria-label="납기율 시계열" className="max-w-full">
      <line x1={pad} y1={y(0)} x2={width - pad} y2={y(0)} stroke="#9ca3af" />
      <line x1={pad} y1={y(1)} x2={width - pad} y2={y(1)} stroke="#e5e7eb" />
      <text x={2} y={y(1) + 4} fontSize="10" fill="#6b7280">100%</text>
      <text x={2} y={y(0) + 4} fontSize="10" fill="#6b7280">0%</text>
      {adoptIdx > 0 && (
        <>
          <line x1={x(adoptIdx)} y1={pad} x2={x(adoptIdx)} y2={height - pad} stroke="#2563eb" strokeDasharray="4 3" />
          <text x={x(adoptIdx) + 2} y={pad + 8} fontSize="10" fill="#2563eb">도입</text>
        </>
      )}
      <path d={path} fill="none" stroke="#16a34a" strokeWidth={2} />
      {pts.map((s, i) => (
        <circle key={s.date} cx={x(i)} cy={y(s.ksf1Punctuality!)} r={3} fill="#16a34a" />
      ))}
    </svg>
  );
}

/**
 * T8.3 분기 리포트 인쇄 뷰 — Before/After 요약표 + 납기율 시계열. window.print()로 PDF(CORE-2).
 */
export function QuarterlyReportPrint({ report }: { report: QuarterlyReport | null }) {
  if (!report) {
    return <main className="mx-auto max-w-3xl p-6"><p className="text-base text-muted-foreground">리포트 데이터가 없습니다.</p></main>;
  }
  const metrics: { label: string; before: number | null; after: number | null; delta: number | null }[] = [
    { label: 'KSF-1 납기 준수율', before: report.before.ksf1Avg, after: report.after.ksf1Avg, delta: report.delta.ksf1 },
    { label: 'KSF-5 수주 일원화율', before: report.before.ksf5Avg, after: report.after.ksf5Avg, delta: report.delta.ksf5 },
    { label: 'KSF-6 수동보정 채택률', before: report.before.ksf6Avg, after: report.after.ksf6Avg, delta: report.delta.ksf6 },
  ];

  return (
    <main className="mx-auto max-w-3xl p-6 text-black">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">분기 KSF 리포트 — {report.quarter}</h1>
        <Button onClick={() => window.print()} className="h-11 text-base">인쇄 / PDF 저장</Button>
      </div>

      <section className="border-2 border-black p-6">
        <header className="mb-4 border-b-2 border-black pb-3">
          <h2 className="text-3xl font-bold">{report.quarter} 도입효과 보고서</h2>
          <p className="mt-1 text-lg">
            기간 {report.rangeStart} ~ {report.rangeEnd} · 도입일 <b>{report.adoptionDate}</b>
            <span className="ml-2 text-base text-gray-600">(Before {report.before.count}일 / After {report.after.count}일)</span>
          </p>
        </header>

        <table className="mb-6 w-full border-collapse text-lg">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 pr-2">지표</th>
              <th className="py-2 pr-2 text-right">도입 전</th>
              <th className="py-2 pr-2 text-right">도입 후</th>
              <th className="py-2 pr-2 text-right">변화</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const d = deltaLabel(m.delta);
              return (
                <tr key={m.label} className="border-b border-gray-400">
                  <td className="py-2 pr-2 font-semibold">{m.label}</td>
                  <td className="py-2 pr-2 text-right">{pct(m.before)}</td>
                  <td className="py-2 pr-2 text-right font-bold">{pct(m.after)}</td>
                  <td className={`py-2 pr-2 text-right font-bold ${d.cls}`}>{d.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="mb-2 text-xl font-bold">납기율 추이 (KSF-1)</h3>
        <TrendChart series={report.series} adoptionDate={report.adoptionDate} />
      </section>
    </main>
  );
}
