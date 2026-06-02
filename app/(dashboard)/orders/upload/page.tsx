import type { Metadata } from 'next';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: '수주 업로드 · EVS' };
export const dynamic = 'force-dynamic';

export default function OrdersUploadPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">수주 엑셀 업로드 (W-2)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          주간 계획·KD 발주·월예상 통합 파일을 올리면 자동으로 종류 감지·실리콘 필터·우선순위 적용 후 적재합니다.
        </p>
      </header>
      <UploadForm />
    </main>
  );
}
