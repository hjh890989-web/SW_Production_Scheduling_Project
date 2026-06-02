import { describe, it, expect } from 'vitest';
import { buildAuditWhere } from './audit-query';

describe('buildAuditWhere (T4.2)', () => {
  it('AC T4.2-1: 본인분만(권한 있어도 user 미지정 시 전체 허용)', () => {
    expect(buildAuditWhere({}, true, 'u1')).toEqual({});
    expect(buildAuditWhere({ user: 'u2' }, true, 'u1')).toMatchObject({ userId: 'u2' });
  });

  it('AC T4.2-F1: audit:read 없으면 본인 userId 강제(다른 user 필터 무시)', () => {
    expect(buildAuditWhere({ user: 'u2' }, false, 'u1')).toMatchObject({ userId: 'u1' });
  });

  it('table·action 필터', () => {
    const w = buildAuditWhere({ table: 'Order', action: 'LOGIN' }, true, 'u1');
    expect(w).toMatchObject({ targetTable: 'Order', action: 'LOGIN' });
  });

  it('날짜 범위 필터', () => {
    const w = buildAuditWhere({ from: '2026-01-01', to: '2026-01-31' }, true, 'u1');
    expect(w.timestamp?.gte?.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(w.timestamp?.lte?.toISOString().slice(0, 10)).toBe('2026-01-31');
  });
});
