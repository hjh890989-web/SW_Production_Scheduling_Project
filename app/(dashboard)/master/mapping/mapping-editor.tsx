'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateMappingRule, simulateUpload, type SimulateResult } from '@/lib/orders/mapping-actions';

export interface MappingRuleRow {
  sourceType: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columnMappingJson: string;
}

const LABEL: Record<string, string> = {
  weekly_plan: '주간 계획',
  kd: 'KD 발주',
  monthly_forecast: '월예상 통합',
};

function RuleCard({ rule }: { rule: MappingRuleRow }) {
  const [sheetName, setSheetName] = useState(rule.sheetName);
  const [headerRow, setHeaderRow] = useState(String(rule.headerRow));
  const [dataStartRow, setDataStartRow] = useState(String(rule.dataStartRow));
  const [mappingJson, setMappingJson] = useState(rule.columnMappingJson);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateMappingRule(rule.sourceType, sheetName, Number(headerRow), Number(dataStartRow), mappingJson);
      setMsg({ text: res.message, ok: res.ok });
    });
  }

  return (
    <div className="rounded-md border p-4">
      <h2 className="mb-3 text-lg font-semibold">{LABEL[rule.sourceType] ?? rule.sourceType}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">
          시트명
          <Input value={sheetName} onChange={(e) => setSheetName(e.target.value)} placeholder="(첫 시트)" />
        </label>
        <label className="text-sm">
          헤더 행
          <Input type="number" value={headerRow} onChange={(e) => setHeaderRow(e.target.value)} />
        </label>
        <label className="text-sm">
          데이터 시작 행
          <Input type="number" value={dataStartRow} onChange={(e) => setDataStartRow(e.target.value)} />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        컬럼 매핑 (JSON)
        <textarea
          value={mappingJson}
          onChange={(e) => setMappingJson(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background p-2 font-mono text-sm"
        />
      </label>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <div className="mt-3">
        <Button size="sm" disabled={pending} onClick={save}>
          저장
        </Button>
      </div>
    </div>
  );
}

function Simulator() {
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => setResult(await simulateUpload(fd)));
  }

  return (
    <div className="rounded-md border p-4">
      <h2 className="mb-2 text-lg font-semibold">매핑 시뮬레이션 (적재 없음)</h2>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => run(e.target.files?.[0] ?? null)}
        className="block w-full rounded-md border border-input p-2 text-sm"
      />
      {pending && <p className="mt-2 text-sm text-muted-foreground">분석 중…</p>}
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? 'text-foreground' : 'text-red-600'}`}>
          {result.ok
            ? `[${result.sourceType}] 파싱 ${result.parsed} / 실리콘 ${result.passed} / 미매칭 ${result.unmatched}`
            : result.message}
        </p>
      )}
    </div>
  );
}

export function MappingEditor({ rows }: { rows: MappingRuleRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <RuleCard key={r.sourceType} rule={r} />
      ))}
      <Simulator />
    </div>
  );
}
