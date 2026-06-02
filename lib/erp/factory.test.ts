import { describe, it, expect } from 'vitest';
import { resolveErpSource, createErpClient } from './factory';
import { ErpClientMock } from './ErpClientMock';

describe('resolveErpSource fallback 체인 (T10.1, AC T10.1-F1)', () => {
  it('기본/api: API 가용 → api', () => {
    expect(resolveErpSource(undefined, { api: true, db: true }).source).toBe('api');
    expect(resolveErpSource('api', { api: true, db: false }).source).toBe('api');
  });

  it('API 미응답 → DB fallback', () => {
    const r = resolveErpSource('api', { api: false, db: true });
    expect(r.source).toBe('db');
    expect(r.reason).toMatch(/fallback/);
  });

  it('API·DB 모두 미응답 → mock', () => {
    expect(resolveErpSource(undefined, { api: false, db: false }).source).toBe('mock');
  });

  it('env=db: DB 가용 → db, 미응답 → mock', () => {
    expect(resolveErpSource('db', { api: true, db: true }).source).toBe('db');
    expect(resolveErpSource('db', { api: true, db: false }).source).toBe('mock');
  });

  it('env=mock → 항상 mock', () => {
    expect(resolveErpSource('mock', { api: true, db: true }).source).toBe('mock');
  });
});

describe('createErpClient / ErpClientMock (T10.1, AC T10.1-1)', () => {
  it('현재(TBD-2) 항상 ErpClientMock 반환', () => {
    expect(createErpClient('api')).toBeInstanceOf(ErpClientMock);
    expect(createErpClient('mock')).toBeInstanceOf(ErpClientMock);
  });

  it('Mock fetchItems: 시드 반환, down이면 throw', async () => {
    const ok = new ErpClientMock([{ productCode: 'P1', customerCode: 'C1', hwasungCode: 'H1', material: 'silicone' }]);
    expect((await ok.fetchItems())[0].productCode).toBe('P1');
    await expect(new ErpClientMock([], true).fetchItems()).rejects.toThrow(/unreachable/);
  });
});
