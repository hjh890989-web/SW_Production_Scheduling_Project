import type { Metadata } from 'next';
import { BETA_SCENARIOS } from '@/lib/feedback/feedback-schema';
import { FeedbackForm } from './feedback-form';

export const metadata: Metadata = { title: '베타 피드백 · EVS' };
export const dynamic = 'force-dynamic';

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">베타 사용성 피드백 (T5.12)</h1>
        <p className="mt-1 text-base text-muted-foreground">
          성형 스케줄(W-4)·드래그 재배분(J-MR-2) 사용 경험을 알려주세요. 도입 성패 평가에 활용됩니다.
        </p>
      </header>
      <FeedbackForm scenarios={[...BETA_SCENARIOS]} />
    </main>
  );
}
