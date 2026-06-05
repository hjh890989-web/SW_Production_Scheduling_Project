'use client';

import { Button } from '@/components/ui/button';
import { needsSolverNotice, ALGORITHM_LABEL, type Algorithm } from '@/lib/scheduler/algorithm-toggle';

/**
 * T12.3.1 알고리즘 토글 (W-4/W-5). 룰 ↔ 솔버 전환.
 * controlled — 상위(클라이언트)가 상태를 소유하고 생성 서버 액션에 algo를 전달한다.
 * 솔버 미설정(SOLVER_URL 없음)·장애 시 Mock → 룰 fallback이므로 안내 표시.
 */
export function AlgorithmToggle({ algo, onToggle }: { algo: Algorithm; onToggle: () => void }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 text-base"
        onClick={onToggle}
        aria-label="스케줄 알고리즘 토글"
      >
        알고리즘: {ALGORITHM_LABEL[algo]}
      </Button>
      {needsSolverNotice(algo) && (
        <span className="text-xs text-amber-700" role="status">
          솔버(OR-Tools) 선택 — 미가동 시 룰 기반으로 자동 대체됩니다.
        </span>
      )}
    </div>
  );
}
