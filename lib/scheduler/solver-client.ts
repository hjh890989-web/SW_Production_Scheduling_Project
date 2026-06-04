import { z } from 'zod';

/**
 * T12.1.3 솔버 엔진 추상화 + 실 HTTP 어댑터 (Phase 2 OR-Tools 마이크로서비스).
 * SOLVER_URL 설정 시 SolverEngineHttp가 POST /schedule/{molding,extrusion} 호출.
 * 실패(HTTP오류·형식불일치·네트워크·timeout)·미설정 시 룰 기반 Mock fallback.
 */
export const SOLVER_TIMEOUT_MS = 30_000;

/** 성형 입력 — solver/solver_molding.py와 동형(룰 SchedulerInput 기반). */
export interface SolverInput {
  weekStart: string;
  orders: { itemId: string; deliveryDate: string; quantity: number; orderId?: string }[];
  items: Record<string, { productCode: string; moldsPerAngle: number; equipmentType: string; allowedSlots: string[] }>;
  equipment: { code: string; type: string; slots: string[]; isActive: boolean }[];
  workdays: string[];
  rotationsPerDay: number;
  rotationsPerNight: number;
  d2Days?: number;
}

/** 압출 입력 — solver/solver_extrusion.py와 동형(룰 ExtrusionInput 기반). */
export interface ExtrusionSolverInput {
  pipeRequests: { itemId: string; productCode: string; extrusionDeadline: string; pipeQuantity: number; orderId?: string }[];
  items: Record<string, { productCode: string; extrusionGroup: number | null; headPin: string | null; extruderFord: boolean; extruderNew: boolean }>;
  extruders: { code: string; isActive: boolean }[];
  workdays: string[];
  shiftCapacity: number;
  efficiency: number;
}

const baseResult = {
  engine: z.enum(['mock', 'solver']),
  objective: z.number().optional(),
  warnings: z.array(z.string()),
  status: z.string().optional(),
};

export const solverResultSchema = z.object({
  ...baseResult,
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
});
export type SolverResult = z.infer<typeof solverResultSchema>;

export const extrusionSolverResultSchema = z.object({
  ...baseResult,
  assignments: z.array(
    z.object({
      itemId: z.string(),
      extruderCode: z.string(),
      date: z.string(),
      shift: z.string(),
      quantity: z.number(),
      extrusionGroup: z.number().nullish(),
      headPin: z.string().nullish(),
      orderId: z.string().nullish(),
    }),
  ),
});
export type ExtrusionSolverResult = z.infer<typeof extrusionSolverResultSchema>;

export interface ISolverEngine {
  readonly kind: 'mock' | 'solver';
  scheduleMolding(input: SolverInput): Promise<SolverResult>;
  scheduleExtrusion(input: ExtrusionSolverInput): Promise<ExtrusionSolverResult>;
}

/** Mock — 외부 호출 없이 빈 배치 + 룰 사용 안내. 실 솔버 장애 시 fallback으로도 사용. */
export class SolverEngineMock implements ISolverEngine {
  readonly kind = 'mock' as const;
  async scheduleMolding(input: SolverInput): Promise<SolverResult> {
    return { engine: 'mock', assignments: [], warnings: [`솔버 미가동 — 룰 기반 스케줄러 사용 (주문 ${input.orders.length}건)`] };
  }
  async scheduleExtrusion(input: ExtrusionSolverInput): Promise<ExtrusionSolverResult> {
    return { engine: 'mock', assignments: [], warnings: [`솔버 미가동 — 룰 기반 스케줄러 사용 (관체요청 ${input.pipeRequests.length}건)`] };
  }
}

/**
 * 실 OR-Tools 솔버 HTTP 어댑터 (T12.1.3).
 * POST {SOLVER_URL}/schedule/{path}, 30s timeout, zod 검증.
 * SEC: 솔버 장애가 스케줄링을 차단하지 않도록 룰 기반 Mock으로 fallback.
 */
export class SolverEngineHttp implements ISolverEngine {
  readonly kind = 'solver' as const;
  constructor(private readonly baseUrl: string) {}

  private async call<T>(path: string, input: unknown, schema: z.ZodType<T>, fallback: () => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SOLVER_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!res.ok) return fallback();
      const parsed = schema.safeParse(await res.json());
      return parsed.success ? parsed.data : fallback();
    } catch {
      return fallback();
    } finally {
      clearTimeout(timer);
    }
  }

  scheduleMolding(input: SolverInput): Promise<SolverResult> {
    return this.call('/schedule/molding', input, solverResultSchema, () => new SolverEngineMock().scheduleMolding(input));
  }
  scheduleExtrusion(input: ExtrusionSolverInput): Promise<ExtrusionSolverResult> {
    return this.call('/schedule/extrusion', input, extrusionSolverResultSchema, () => new SolverEngineMock().scheduleExtrusion(input));
  }
}

export function resolveSolverEndpoint(env: string | undefined): { configured: boolean; url: string | null } {
  return { configured: !!env, url: env ?? null };
}

export function createSolverEngine(env: string | undefined = process.env.SOLVER_URL): ISolverEngine {
  const { configured, url } = resolveSolverEndpoint(env);
  return configured && url ? new SolverEngineHttp(url) : new SolverEngineMock();
}
