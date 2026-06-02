import { describe, it, expect, vi } from 'vitest';
import { resolveMesClientKind, createMesClient } from './factory';
import { MesClientMock } from './MesClientMock';

describe('resolveMesClientKind (T9.1)', () => {
  it('기본/명시 mock → mock', () => {
    expect(resolveMesClientKind(undefined).reason).toBe('기본 mock');
    expect(resolveMesClientKind('mock').kind).toBe('mock');
  });

  it('live 요청 → TBD-3 사유로 mock fallback (AC T9.1-F1)', () => {
    const r = resolveMesClientKind('live');
    expect(r.kind).toBe('mock');
    expect(r.reason).toMatch(/TBD-3/);
  });

  it('알 수 없는 값 → mock fallback 사유 명시', () => {
    expect(resolveMesClientKind('xyz').reason).toMatch(/알 수 없는/);
  });
});

describe('createMesClient (T9.1, AC T9.1-1)', () => {
  it('MES_CLIENT=mock → MesClientMock 인스턴스', () => {
    expect(createMesClient('mock')).toBeInstanceOf(MesClientMock);
  });

  it('live fallback 시 경고 로그 1회', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createMesClient('live');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe('MesClientMock 동작 (T9.1)', () => {
  it('fetchResults는 since 이후만, sendInstruction은 ACK 반환', async () => {
    const client = new MesClientMock([
      { externalId: 'e1', equipmentCode: 'LP-01', productCode: 'P1', process: 'MOLDING', quantity: 10, producedAt: '2026-06-01T00:00:00.000Z' },
      { externalId: 'e2', equipmentCode: 'LP-01', productCode: 'P1', process: 'MOLDING', quantity: 5, producedAt: '2026-06-03T00:00:00.000Z' },
    ]);
    const got = await client.fetchResults('2026-06-02T00:00:00.000Z');
    expect(got.map((r) => r.externalId)).toEqual(['e2']);

    const ack = await client.sendInstruction({ instructionId: 'WI-1', weekStart: '2026-06-01', process: 'MOLDING', lines: [] });
    expect(ack).toEqual({ ok: true, ackId: 'MOCK-ACK-WI-1' });
  });
});
