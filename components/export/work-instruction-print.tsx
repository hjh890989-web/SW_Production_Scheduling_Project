'use client';

import { Button } from '@/components/ui/button';
import type { WorkInstruction } from '@/lib/export/work-instruction';

/**
 * T8.2 작업지시서 인쇄 뷰 — A4·큰 글씨(베테랑 친화). 인쇄/PDF는 window.print()(CORE-2).
 * @media print에서 화면 전용 요소(.no-print)를 숨기고 지시서당 페이지 분할.
 */
export function WorkInstructionPrint({
  weekStart,
  instructions,
}: {
  weekStart: string;
  instructions: WorkInstruction[];
}) {
  return (
    <main className="mx-auto max-w-4xl p-6 text-black">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .wi-sheet { page-break-after: always; }
          .wi-sheet:last-child { page-break-after: auto; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">작업지시서 (주간 {weekStart})</h1>
          <p className="mt-1 text-base text-muted-foreground">총 {instructions.length}건 · A4 인쇄 / PDF 저장</p>
        </div>
        <Button onClick={() => window.print()} disabled={instructions.length === 0} className="h-11 text-base">
          인쇄 / PDF 저장
        </Button>
      </div>

      {instructions.length === 0 ? (
        <p className="no-print rounded border border-dashed p-8 text-center text-muted-foreground">
          해당 주간에 출력할 스케줄이 없습니다.
        </p>
      ) : (
        instructions.map((wi) => (
          <section key={wi.id} className="wi-sheet mb-8 border-2 border-black p-6">
            <header className="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
              <div>
                <h2 className="text-3xl font-bold">
                  {wi.process} 작업지시서 — {wi.line}
                </h2>
                <p className="mt-1 text-xl">
                  일자 <b>{wi.date}</b> · 총 {wi.process === '성형' ? '회전수' : '수량'} <b>{wi.totalQty}</b>
                </p>
              </div>
              {/* QR 대용: 작업지시 ID 텍스트 (추후 MES 연동, MINOR-2) */}
              <div className="border-2 border-black px-3 py-2 text-center">
                <p className="text-xs text-gray-600">작업지시 ID</p>
                <p className="font-mono text-lg font-bold">{wi.id}</p>
              </div>
            </header>

            <table className="w-full border-collapse text-xl">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 pr-2">{wi.process === '성형' ? '주야/슬롯' : '교대'}</th>
                  <th className="py-2 pr-2">품번</th>
                  <th className="py-2 pr-2 text-right">{wi.process === '성형' ? '회전수' : '수량'}</th>
                  <th className="py-2 pr-2">상태</th>
                </tr>
              </thead>
              <tbody>
                {wi.rows.map((r, i) => (
                  <tr key={`${wi.id}-${i}`} className="border-b border-gray-400">
                    <td className="py-2 pr-2">{r.slot}</td>
                    <td className="py-2 pr-2 font-bold">{r.productCode}</td>
                    <td className="py-2 pr-2 text-right">{r.qty}</td>
                    <td className="py-2 pr-2">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </main>
  );
}
