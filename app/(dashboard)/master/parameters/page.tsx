import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { PARAM_DEFS } from '@/lib/master/operation-params';
import { ParamsTable, type ParamRow } from './params-table';

export const metadata: Metadata = { title: '운영 파라미터 · EVS' };
export const dynamic = 'force-dynamic';

export default async function ParametersMasterPage() {
  const stored = await prisma.operationParam.findMany();
  const byKey = new Map(stored.map((p) => [p.key, p.value]));

  const rows: ParamRow[] = PARAM_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    category: def.category,
    min: def.min,
    max: def.max,
    value: byKey.get(def.key) ?? String(def.defaultValue),
  }));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">운영 파라미터 (W-6.3)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          회전수·효율·룰 등 {rows.length}개 파라미터. 변경은 다음 스케줄링부터 반영됩니다 (R-9).
        </p>
      </header>
      <ParamsTable rows={rows} />
    </main>
  );
}
