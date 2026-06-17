'use client';

import Link from 'next/link';
import { useRef, useState, useTransition, type DragEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { uploadOrdersMulti, type UploadResult } from '@/lib/orders/upload';
import { MAX_UPLOAD_BYTES, detectSourceType } from '@/lib/orders/detect';
import type { SourceType } from '@/lib/orders/types';

const TYPE_LABEL: Record<SourceType, string> = {
  weekly_plan: '주간 계획',
  kd: 'KD 발주',
  monthly_forecast: '월예상/통합',
};

type ResultRow = UploadResult & { fileName: string };

export function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => /\.xlsx?$/i.test(f.name));
    setError(null);
    setResults(null);
    // 같은 파일명은 최신 파일로 교체, 나머지는 누적
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      for (const f of incoming) map.set(f.name, f);
      return [...map.values()];
    });
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function submit() {
    setError(null);
    setResults(null);
    if (files.length === 0) {
      setError('파일을 선택하세요.');
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setError(`'${tooBig.name}'이(가) 50MB를 초과합니다.`);
      return;
    }
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    startTransition(async () => {
      const res = await uploadOrdersMulti(fd);
      if (res.results.length > 0) setResults(res.results);
      else setError(res.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-input bg-background'
        }`}
      >
        <p className="text-base font-medium">엑셀 파일을 여기로 드래그하거나 클릭해 선택</p>
        <p className="text-sm text-muted-foreground">
          주간 계획 · KD 발주 · 월예상(통합) — 3종을 한 번에 올릴 수 있습니다 (.xlsx/.xls)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f) => {
            const t = detectSourceType(f.name);
            return (
              <li
                key={f.name}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono">{f.name}</span>
                  {t ? (
                    <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {TYPE_LABEL[t]}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      종류 미인식
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  className="shrink-0 text-muted-foreground hover:text-red-600"
                  aria-label={`${f.name} 제거`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button onClick={submit} disabled={pending || files.length === 0} className="h-11 text-base">
        {pending ? '처리 중…' : `업로드 및 적재${files.length > 1 ? ` (${files.length}개)` : ''}`}
      </Button>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {results?.map((result, i) => (
        <div key={`${result.fileName}-${i}`} className="rounded-md border p-4">
          <p className="font-mono text-sm text-muted-foreground">{result.fileName}</p>
          {result.ok ? (
            <>
              <p className="font-semibold text-green-700">{result.message}</p>
              <ul className="mt-2 text-sm text-muted-foreground">
                <li>파일 종류: {result.sourceType}</li>
                <li>ACTIVE 적재: {result.loaded}건</li>
                <li>SUPERSEDED: {result.superseded}건</li>
                <li>비실리콘 제외: {result.rejected}건</li>
              </ul>
              {result.unmatched && result.unmatched.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-amber-700">
                    미매칭 품번 {result.unmatched.length}건 — 마스터 등록 필요
                  </p>
                  <ul className="mt-1 max-h-40 overflow-y-auto text-sm">
                    {result.unmatched.map((c) => (
                      <li key={c} className="font-mono">
                        {c}
                      </li>
                    ))}
                  </ul>
                  <Link href="/master/items" className="mt-2 inline-block text-sm text-primary underline">
                    품번 마스터로 이동 →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="font-semibold text-red-700" role="alert">
              {result.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
