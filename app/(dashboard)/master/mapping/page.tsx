import type { Metadata } from 'next';
import { getMappingRules } from '@/lib/orders/mapping-actions';
import { MappingEditor, type MappingRuleRow } from './mapping-editor';

export const metadata: Metadata = { title: '엑셀 매핑 룰 · EVS' };
export const dynamic = 'force-dynamic';

export default async function MappingRulePage() {
  const rules = await getMappingRules();
  const rows: MappingRuleRow[] = rules.map((r) => ({
    sourceType: r.sourceType,
    sheetName: r.sheetName ?? '',
    headerRow: r.headerRow,
    dataStartRow: r.dataStartRow,
    columnMappingJson: JSON.stringify(r.columnMapping),
  }));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">엑셀 매핑 룰 (F-2.2)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          양식 변경 시 코드 수정 없이 시트명·헤더 행·컬럼 매핑을 조정합니다. 변경은 다음 업로드부터 적용됩니다.
        </p>
      </header>
      <MappingEditor rows={rows} />
    </main>
  );
}
