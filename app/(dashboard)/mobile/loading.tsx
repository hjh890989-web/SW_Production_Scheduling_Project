import { KpiCardSkeleton } from '@/components/ui/skeleton';

/** T12.5.4 모바일 KSF 로딩 스켈레톤 (Next.js route loading UI). */
export default function MobileKsfLoading() {
  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-3 h-7 w-40 animate-pulse rounded bg-muted" />
      <KpiCardSkeleton count={4} />
    </main>
  );
}
