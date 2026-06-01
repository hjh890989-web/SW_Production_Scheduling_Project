import { describe, it, expect, vi, beforeEach } from 'vitest';

// next/headers는 요청 스코프 밖이면 throw — logAudit이 안전히 처리하는지 확인
vi.mock('next/headers', () => ({
  headers: () => {
    throw new Error('headers() outside request scope');
  },
}));

const create = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: { auditLog: { create: (...args: unknown[]) => create(...args) } },
}));

import { logAudit, serializeAuditValue } from './audit';

describe('serializeAuditValue (T1.6)', () => {
  it('null/undefined → null', () => {
    expect(serializeAuditValue(null)).toBeNull();
    expect(serializeAuditValue(undefined)).toBeNull();
  });
  it('문자열은 그대로, 객체는 JSON 직렬화', () => {
    expect(serializeAuditValue('abc')).toBe('abc');
    expect(serializeAuditValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe('logAudit (T1.6)', () => {
  beforeEach(() => create.mockReset());

  it('AC T1.6-2: 모든 필드를 매핑해 INSERT 한다', async () => {
    create.mockResolvedValueOnce({});
    await logAudit({
      userId: 'u1',
      userRole: 'ADMIN',
      action: 'LOGIN',
      table: 'User',
      key: 'u1',
      before: { x: 1 },
      after: { x: 2 },
      ipAddress: '10.0.0.1',
    });
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 'u1',
      userRole: 'ADMIN',
      action: 'LOGIN',
      targetTable: 'User',
      beforeValue: '{"x":1}',
      afterValue: '{"x":2}',
      ipAddress: '10.0.0.1',
    });
  });

  it('AC T1.6-F1: DB INSERT 실패해도 throw하지 않고 fallback', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    create.mockRejectedValueOnce(new Error('db down'));
    await expect(logAudit({ action: 'LOGIN' })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
