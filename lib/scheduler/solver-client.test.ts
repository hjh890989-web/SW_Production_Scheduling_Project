import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  resolveSolverEndpoint,
  createSolverEngine,
  SolverEngineMock,
  SolverEngineHttp,
  solverResultSchema,
  SOLVER_TIMEOUT_MS,
  type SolverInput,
} from './solver-client';

const sampleInput: SolverInput = {
  weekStart: '2026-05-18',
  orders: [{ itemId: 'I1', deliveryDate: '2026-05-22', quantity: 10 }],
  items: { I1: { productCode: 'P1', moldsPerAngle: 5, equipmentType: 'MOLDING_LP', allowedSlots: ['A'] } },
  equipment: [{ code: 'LP1', type: 'MOLDING_LP', slots: ['A'], isActive: true }],
  workdays: ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'],
  rotationsPerDay: 10,
  rotationsPerNight: 10,
};

afterEach(() => vi.unstubAllGlobals());

describe('resolveSolverEndpoint (T12.1.3)', () => {
  it('SOLVER_URL 설정 여부', () => {
    expect(resolveSolverEndpoint('http://solver:8000')).toEqual({ configured: true, url: 'http://solver:8000' });
    expect(resolveSolverEndpoint(undefined)).toEqual({ configured: false, url: null });
  });
  it('timeout 30초', () => {
    expect(SOLVER_TIMEOUT_MS).toBe(30_000);
  });
});

describe('createSolverEngine (T12.1.3)', () => {
  it('SOLVER_URL 미설정 → Mock', () => {
    expect(createSolverEngine(undefined)).toBeInstanceOf(SolverEngineMock);
  });
  it('SOLVER_URL 설정 → 실 HTTP 어댑터', () => {
    expect(createSolverEngine('http://solver:8000')).toBeInstanceOf(SolverEngineHttp);
  });
});

describe('SolverEngineMock', () => {
  it('Mock 결과는 스키마 통과 + 룰 사용 경고', async () => {
    const res = await new SolverEngineMock().scheduleMolding(sampleInput);
    expect(solverResultSchema.safeParse(res).success).toBe(true);
    expect(res.engine).toBe('mock');
    expect(res.warnings[0]).toMatch(/룰 기반/);
  });
});

describe('SolverEngineHttp (실 HTTP 어댑터)', () => {
  it('200 + 유효 응답 → solver 결과 반환', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          engine: 'solver',
          assignments: [{ itemId: 'I1', equipmentCode: 'LP1', date: '2026-05-20', slot: 'A', daynight: 'NIGHT', rotations: 2 }],
          objective: 2,
          warnings: [],
          status: 'OPTIMAL',
        }),
      })),
    );
    const res = await new SolverEngineHttp('http://solver:8000').scheduleMolding(sampleInput);
    expect(res.engine).toBe('solver');
    expect(res.assignments).toHaveLength(1);
    expect(res.assignments[0].slot).toBe('A');
  });

  it('HTTP 오류(500) → 룰 fallback(mock)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const res = await new SolverEngineHttp('http://solver:8000').scheduleMolding(sampleInput);
    expect(res.engine).toBe('mock');
    expect(res.warnings[0]).toMatch(/오류|fallback/);
  });

  it('응답 형식 불일치 → 룰 fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ bad: 'shape' }) })));
    const res = await new SolverEngineHttp('http://solver:8000').scheduleMolding(sampleInput);
    expect(res.engine).toBe('mock');
  });

  it('네트워크 오류 → 룰 fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    const res = await new SolverEngineHttp('http://solver:8000').scheduleMolding(sampleInput);
    expect(res.engine).toBe('mock');
    expect(res.warnings[0]).toMatch(/룰 기반/);
  });
});
