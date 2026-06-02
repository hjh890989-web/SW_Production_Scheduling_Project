import { describe, it, expect } from 'vitest';
import {
  resolveSolverEndpoint,
  createSolverEngine,
  SolverEngineMock,
  solverResultSchema,
  SOLVER_TIMEOUT_MS,
} from './solver-client';

describe('resolveSolverEndpoint (T12.1.3)', () => {
  it('SOLVER_URL 설정 여부', () => {
    expect(resolveSolverEndpoint('http://solver:8000')).toEqual({ configured: true, url: 'http://solver:8000' });
    expect(resolveSolverEndpoint(undefined)).toEqual({ configured: false, url: null });
  });

  it('timeout 30초', () => {
    expect(SOLVER_TIMEOUT_MS).toBe(30_000);
  });
});

describe('createSolverEngine / Mock (T12.1.3, AC T12.1.3-F1)', () => {
  it('현재(미가동) 항상 Mock', () => {
    expect(createSolverEngine(undefined)).toBeInstanceOf(SolverEngineMock);
    expect(createSolverEngine('http://solver:8000')).toBeInstanceOf(SolverEngineMock);
  });

  it('Mock 결과는 스키마 통과 + 룰 사용 경고', async () => {
    const res = await new SolverEngineMock().scheduleMolding({ weekStart: '2026-06-01', demands: [] });
    expect(solverResultSchema.safeParse(res).success).toBe(true);
    expect(res.engine).toBe('mock');
    expect(res.warnings[0]).toMatch(/룰 기반/);
  });
});
