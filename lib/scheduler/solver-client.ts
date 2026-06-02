import { z } from 'zod';

/**
 * T12.1.3 솔버 엔진 추상화 (D20). Phase 2 Python OR-Tools 마이크로서비스 교체 대비.
 * 실 솔버(SOLVER_URL) 미가동이므로 현재는 Mock 귀결 — 실 HTTP 호출 코드 미작성.
 */
export const SOLVER_TIMEOUT_MS = 30_000;

export interface SolverInput {
  weekStart: string; // YYYY-MM-DD
  demands: { itemId: string; quantity: number; dueDate: string }[];
}

export interface SolverAssignment {
  itemId: string;
  equipmentCode: string;
  date: string;
  slot: string;
}

export const solverResultSchema = z.object({
  engine: z.enum(['mock', 'solver']),
  assignments: z.array(
    z.object({ itemId: z.string(), equipmentCode: z.string(), date: z.string(), slot: z.string() }),
  ),
  objective: z.number().optional(),
  warnings: z.array(z.string()),
});
export type SolverResult = z.infer<typeof solverResultSchema>;

export interface ISolverEngine {
  readonly kind: 'mock' | 'solver';
  scheduleMolding(input: SolverInput): Promise<SolverResult>;
}

/** Mock 솔버 — 외부 호출 없이 즉시 빈 배치 + 안내(룰 기반 사용 권장). */
export class SolverEngineMock implements ISolverEngine {
  readonly kind = 'mock' as const;
  async scheduleMolding(input: SolverInput): Promise<SolverResult> {
    return {
      engine: 'mock',
      assignments: [],
      warnings: [`솔버 미가동(TBD) — 룰 기반 스케줄러 사용 (수요 ${input.demands.length}건)`],
    };
  }
}

/** env SOLVER_URL 설정 여부(순수). 설정돼도 실 구현 전까지 Mock로 귀결. */
export function resolveSolverEndpoint(env: string | undefined): { configured: boolean; url: string | null } {
  return { configured: !!env, url: env ?? null };
}

export function createSolverEngine(env: string | undefined = process.env.SOLVER_URL): ISolverEngine {
  const { configured } = resolveSolverEndpoint(env);
  if (configured) {
    // 실 OR-Tools 솔버 어댑터는 Phase 2 도입(현재 미가동) — Mock fallback
    console.warn('[Solver] SOLVER_URL 설정됨이나 실 구현 미도입 → Mock');
  }
  return new SolverEngineMock();
}
