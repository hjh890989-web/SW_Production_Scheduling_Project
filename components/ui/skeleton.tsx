import { skeletonKeys } from '@/lib/ui/skeleton';

/**
 * T12.5.4 스켈레톤 — 로딩 자리표시. animate-pulse 회색 블록.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />;
}

/** KPI 카드 그리드 로딩 스켈레톤(모바일 2열). */
export function KpiCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="status" aria-label="로딩 중">
      {skeletonKeys(count, 'kpi').map((k) => (
        <div key={k} className="rounded-xl border bg-background p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
