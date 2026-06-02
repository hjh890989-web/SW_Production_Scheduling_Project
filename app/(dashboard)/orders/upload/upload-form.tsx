'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { uploadOrders, type UploadResult } from '@/lib/orders/upload';
import { MAX_UPLOAD_BYTES } from '@/lib/orders/detect';

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setResult(null);
    if (!file) {
      setError('파일을 선택하세요.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('파일이 50MB를 초과합니다.');
      return;
    }
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      const res = await uploadOrders(fd);
      if (res.ok) setResult(res);
      else setError(res.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full rounded-md border border-input bg-background p-3 text-base file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
      />
      <Button onClick={submit} disabled={pending || !file} className="h-11 text-base">
        {pending ? '처리 중…' : '업로드 및 적재'}
      </Button>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-md border p-4">
          <p className="font-semibold text-green-700">{result.message}</p>
          <ul className="mt-2 text-sm text-muted-foreground">
            <li>파일 종류: {result.sourceType}</li>
            <li>ACTIVE 적재: {result.loaded}건</li>
            <li>SUPERSEDED: {result.superseded}건</li>
            <li>비실리콘 제외: {result.rejected}건</li>
          </ul>
          {result.unmatched && result.unmatched.length > 0 && (
            <div className="mt-3">
              <p className="font-medium text-amber-700">미매칭 품번 {result.unmatched.length}건 — 마스터 등록 필요</p>
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
        </div>
      )}
    </div>
  );
}
