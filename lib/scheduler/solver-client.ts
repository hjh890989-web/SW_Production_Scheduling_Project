import { z } from 'zod';

/**
 * T12.1.3 솔버 엔진 추상화 (D20) + 실 HTTP 어댑터 (Phase 2 OR-Tools 마이크로서비스 연동).
 * SOLVER_URL 설정 시 SolverEngineHttp가 POST /schedule/molding 호출. 실패·미설정 시 룰 기반 Mock fallback.
 */
export const SOLVER_TIMEOUT_MS = 30_000;

/** solver/app.py 입력과 동형 (룰 스케줄러 SchedulerInput 기반). */
export interface SolverInput {
  weekStart: string; // YYYY-MM-DD
  orders: { itemId: string; deliveryDate: string; quantity: number; orderId?: string }[];
  items: Record<string, { productCode: string; moldsPerAngle: number; equipmentType: string; allowedSlots: string[] }>;
  equipment: { code: string; type: string; slots: string[]; isActive: boolean }[];
  workdays: string[];
  rotationsPerDay: number;
  rotationsPerNight: number;
  d2Days?: number;
}

export const solverResultSchema = z.object({
  engine: z.enum(['mock', 'solver']),
  assignments: z.array(
    z.object({
      itemId: z.string(),
      equipmentCode: z.string(),
      date: z.string(),
      slot: z.string(),
      daynight: z.string().optional(),
      rotations: z.number().optional(),
      orderId: z.string().nullish(),
    }),
  ),
  objective: z.number().optional(),
  warnings: z.array(z.string()),
  status: z.string().optional(),
});
export type SolverResult = z.infer<typeof solverResultSchema>;

export interface ISolverEngine {
  readonly kind: 'mock' | 'solver';
  scheduleMolding(input: SolverInput): Promise<SolverResult>;
}

/** Mock 솔버 — 외부 호출 없이 빈 배치 + 룰 사용 안내. 실 솔버 장애 시 fallback으로도 사용. */
export class SolverEngineMock implements ISolverEngine {
  readonly kind = 'mock' as const;
  async scheduleMolding(input: SolverInput): Promise<SolverResult> {
    return {
      engine: 'mock',
      assignments: [],
      warnings: [`솔버 미가동 — 룰 기반 스케줄러 사용 (주문 ${input.orders.length}건)`],
    };
  }
}

/**
 * 실 OR-Tools 솔버 HTTP 어댑터 (T12.1.3).
 * POST {SOLVER_URL}/schedule/molding, 30s timeout, zod 응답 검증.
 * SEC: 솔버 장애(오류·형식불일치·네트워크·timeout)가 스케줄링을 차단하지 않도록 룰 기반 Mock으로 fallback.
 */
export class SolverEngineHttp implements ISolverEngine {
  readonly kind = 'solver' as const;
  constructor(private readonly baseUrl: string) {}

  async scheduleMolding(input: SolverInput): Promise<SolverResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SOLVER_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/schedule/molding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!res.ok) {
        return { engine: 'mock', assignments: [], warnings: [`솔버 응답 오류(${res.status}) — 룰 fallback`] };
      }
      const parsed = solverResultSchema.safeParse(await res.json());
      if (!parsed.success) {
        return { engine: 'mock', assignments: [], warnings: ['솔버 응답 형식 오류 — 룰 fallback'] };
      }
      return parsed.data;
    } catch {
      // 네트워크/timeout/abort — 룰 fallback
      return new SolverEngineMock().scheduleMolding(input);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** env SOLVER_URL 설정 여부(순수). */
export function resolveSolverEndpoint(env: string | undefined): { configured: boolean; url: string | null } {
  return { configured: !!env, url: env ?? null };
}

export function createSolverEngine(env: string | undefined = process.env.SOLVER_URL): ISolverEngine {
  const { configured, url } = resolveSolverEndpoint(env);
  return configured && url ? new SolverEngineHttp(url) : new SolverEngineMock();
}
