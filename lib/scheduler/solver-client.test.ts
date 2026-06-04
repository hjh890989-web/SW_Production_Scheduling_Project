import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  resolveSolverEndpoint,
  createSolverEngine,
  SolverEngineMock,
  SolverEngineHttp,
  solverResultSchema,
  extrusionSolverResultSchema,
  SOLVER_TIMEOUT_MS,
  type SolverInput,
  type ExtrusionSolverInput,
} from './solver-client';

const WORKDAYS = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'];

const moldingInput: SolverInput = {
  weekStart: '2026-05-18',
  orders: [{ itemId: 'I1', deliveryDate: '2026-05-22', quantity: 10 }],
  items: { I1: { productCode: 'P1', moldsPerAngle: 5, equipmentType: 'MOLDING_LP', allowedSlots: ['A'] } },
  equipment: [{ code: 'LP1', type: 'MOLDING_LP', slots: ['A'], isActive: true }],
  workdays: WORKDAYS,
  rotationsPerDay: 10,
  rotationsPerNight: 10,
};

const extrusionInput: ExtrusionSolverInput = {
  pipeRequests: [{ itemId: 'I1', productCode: 'P1', extrusionDeadline: '2026-05-21', pipeQuantity: 50 }],
  items: { I1: { productCode: 'P1', extrusionGroup: 1, headPin: 'H1', extruderFord: true, extruderNew: false } },
  extruders: [{ code: 'FORD', isActive: true }],
  workdays: WORKDAYS,
  shiftCapacity: 100,
  efficiency: 0.75,
};

const stubFetch = (impl: () => unknown) => vi.stubGlobal('fetch', vi.fn(impl));

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
  it('성형 Mock — 스키마 통과 + 룰 경고', async () => {
    const r = await new SolverEngineMock().scheduleMolding(moldingInput);
    expect(solverResultSchema.safeParse(r).success).toBe(true);
    expect(r.engine).toBe('mock');
    expect(r.warnings[0]).toMatch(/룰 기반/);
  });
  it('압출 Mock — 스키마 통과 + 룰 경고', async () => {
    const r = await new SolverEngineMock().scheduleExtrusion(extrusionInput);
    expect(extrusionSolverResultSchema.safeParse(r).success).toBe(true);
    expect(r.engine).toBe('mock');
    expect(r.warnings[0]).toMatch(/룰 기반/);
  });
});

describe('SolverEngineHttp — 성형', () => {
  it('200 + 유효 응답 → solver 결과', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ engine: 'solver', assignments: [{ itemId: 'I1', equipmentCode: 'LP1', date: '2026-05-20', slot: 'A', rotations: 2 }], warnings: [], status: 'OPTIMAL' }),
    }));
    const r = await new SolverEngineHttp('http://solver:8000').scheduleMolding(moldingInput);
    expect(r.engine).toBe('solver');
    expect(r.assignments).toHaveLength(1);
  });
  it('HTTP 500 → 룰 fallback(mock)', async () => {
    stubFetch(async () => ({ ok: false, status: 500 }));
    const r = await new SolverEngineHttp('http://solver:8000').scheduleMolding(moldingInput);
    expect(r.engine).toBe('mock');
  });
  it('형식 불일치 → 룰 fallback', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ bad: 'shape' }) }));
    const r = await new SolverEngineHttp('http://solver:8000').scheduleMolding(moldingInput);
    expect(r.engine).toBe('mock');
  });
  it('네트워크 오류 → 룰 fallback', async () => {
    stubFetch(async () => {
      throw new Error('ECONNREFUSED');
    });
    const r = await new SolverEngineHttp('http://solver:8000').scheduleMolding(moldingInput);
    expect(r.engine).toBe('mock');
  });
});

describe('SolverEngineHttp — 압출', () => {
  it('200 + 유효 응답 → solver 결과', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ engine: 'solver', assignments: [{ itemId: 'I1', extruderCode: 'FORD', date: '2026-05-18', shift: 'DAY_FIRST', quantity: 50, extrusionGroup: 1, headPin: 'H1' }], warnings: [], status: 'OPTIMAL' }),
    }));
    const r = await new SolverEngineHttp('http://solver:8000').scheduleExtrusion(extrusionInput);
    expect(r.engine).toBe('solver');
    expect(r.assignments[0].extruderCode).toBe('FORD');
  });
  it('실패 → 룰 fallback(mock)', async () => {
    stubFetch(async () => ({ ok: false, status: 503 }));
    const r = await new SolverEngineHttp('http://solver:8000').scheduleExtrusion(extrusionInput);
    expect(r.engine).toBe('mock');
    expect(r.warnings[0]).toMatch(/룰 기반/);
  });
});
