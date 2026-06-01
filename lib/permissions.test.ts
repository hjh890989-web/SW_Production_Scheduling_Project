import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  requirePermission,
  ROLE_PERMISSIONS,
  PERMISSIONS,
} from './permissions';
import { ForbiddenError } from '@/lib/auth/assert';
import { ROLES } from '@/auth.config';

describe('RBAC matrix (T1.2 — PRD 부록 D)', () => {
  it('AC T1.2-1: MOLDING_LEADER는 molding:write 보유 → true', () => {
    expect(hasPermission({ role: 'MOLDING_LEADER' }, 'molding:write')).toBe(true);
  });

  it('AC T1.2-2: MOLDING_LEADER는 extrusion:write 미보유 → false', () => {
    expect(hasPermission({ role: 'MOLDING_LEADER' }, 'extrusion:write')).toBe(false);
  });

  it('ADMIN 와일드카드는 모든 권한을 가진다', () => {
    for (const p of PERMISSIONS) {
      expect(hasPermission({ role: 'ADMIN' }, p)).toBe(true);
    }
  });

  it('미인증/미정의 role은 모든 권한 거부', () => {
    expect(hasPermission(null, 'master:read')).toBe(false);
    expect(hasPermission({ role: 'NOPE' }, 'master:read')).toBe(false);
    expect(hasPermission(undefined, 'master:read')).toBe(false);
  });

  it('6 Role 매트릭스가 PRD 부록 D와 일치 (전수 검증)', () => {
    const expected: Record<string, string[]> = {
      ADMIN: ['*'],
      PRODUCTION_MANAGER: [
        'master:read', 'master:write',
        'order:read', 'order:write', 'order:upload',
        'inventory:read', 'inventory:write',
        'molding:read', 'molding:write', 'molding:confirm',
        'extrusion:read', 'extrusion:write', 'extrusion:confirm',
        'audit:read',
      ],
      MOLDING_LEADER: ['master:read', 'molding:read', 'molding:write', 'molding:result', 'extrusion:read'],
      EXTRUSION_LEADER: ['master:read', 'molding:read', 'extrusion:read', 'extrusion:write', 'extrusion:result'],
      SALES_PURCHASE: ['master:read', 'order:read', 'order:write', 'order:upload'],
      EXECUTIVE: ['master:read', 'order:read', 'inventory:read', 'molding:read', 'extrusion:read', 'audit:read'],
    };
    for (const role of ROLES) {
      expect([...ROLE_PERMISSIONS[role]]).toEqual(expected[role]);
    }
  });

  it('requirePermission: 권한 없으면 ForbiddenError throw', () => {
    expect(() => requirePermission({ role: 'SALES_PURCHASE' }, 'molding:write')).toThrow(ForbiddenError);
    expect(() => requirePermission({ role: 'PRODUCTION_MANAGER' }, 'molding:write')).not.toThrow();
  });

  it('AC T1.2-F1: 미정의 Permission 문자열은 컴파일 에러 (타입 안전)', () => {
    // @ts-expect-error 'foo:bar'는 Permission union에 없음 → tsc가 거부
    expect(hasPermission({ role: 'ADMIN' }, 'foo:bar')).toBe(true);
  });
});
