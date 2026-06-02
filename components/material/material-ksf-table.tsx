import type { MaterialKsf } from '@/lib/material/ksf-by-material';
import { MATERIAL_LABEL } from '@/lib/material/material';

/**
 * T12.6.4 자재별 KSF(납기율) 표 — 순수 표시 컴포넌트. 집계는 aggregateKsfByMaterial.
 */
export function MaterialKsfTable({ rows }: { rows: MaterialKsf[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">자재별 실적 데이터가 없습니다.</p>;
  }
  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-2">자재</th>
          <th className="py-2 pr-2 text-right">실적</th>
          <th className="py-2 pr-2 text-right">납기 준수</th>
          <th className="py-2 pr-2 text-right">납기율</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.material} className="border-b">
            <td className="py-2 pr-2 font-semibold">
              {MATERIAL_LABEL[r.material as keyof typeof MATERIAL_LABEL] ?? r.material}
            </td>
            <td className="py-2 pr-2 text-right">{r.total}</td>
            <td className="py-2 pr-2 text-right">{r.onTime}</td>
            <td className="py-2 pr-2 text-right font-bold">
              {r.punctuality === null ? '—' : `${Math.round(r.punctuality * 100)}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
