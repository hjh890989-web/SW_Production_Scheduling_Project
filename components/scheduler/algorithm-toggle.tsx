'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toggleAlgorithm, needsSolverNotice, ALGORITHM_LABEL, type Algorithm } from '@/lib/scheduler/algorithm-toggle';

/**
 * T12.3.1 알고리즘 토글 (W-4/W-5). 룰 ↔ 솔버 전환. 솔버는 Phase 2 미가동(Mock) — 안내 표시.
 */
export function AlgorithmToggle() {
  const [algo, setAlgo] = useState<Algorithm>('rule');

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 text-base"
        onClick={() => setAlgo((a) => toggleAlgorithm(a))}
        aria-label="스케줄 알고리즘 토글"
      >
        알고리즘: {ALGORITHM_LABEL[algo]}
      </Button>
      {needsSolverNotice(algo) && (
        <span className="text-xs text-amber-700" role="status">
          솔버(OR-Tools)는 Phase 2 도입 예정 — 현재는 룰 기반 결과를 사용하세요.
        </span>
      )}
    </div>
  );
}
