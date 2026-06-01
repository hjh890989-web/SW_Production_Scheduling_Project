import { ROLES, type Role } from '@/auth.config';
import { ForbiddenError } from '@/lib/auth/assert';

/**
 * RBAC 권한 정의 — PRD v1.4 부록 D 매트릭스와 100% 일치 (T1.2).
 * Permission은 union literal type → 미정의 권한 문자열은 컴파일 에러 (AC T1.2-F1).
 */
export const PERMISSIONS = [
  'master:read',
  'master:write',
  'order:read',
  'order:write',
  'order:upload',
  'inventory:read',
  'inventory:write',
  'molding:read',
  'molding:write',
  'molding:confirm',
  'molding:result',
  'extrusion:read',
  'extrusion:write',
  'extrusion:confirm',
  'extrusion:result',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Admin wildcard — 모든 권한 보유. */
const WILDCARD = '*' as const;

export const ROLE_PERMISSIONS: Record<Role, readonly (Permission | typeof WILDCARD)[]> = {
  ADMIN: [WILDCARD],
  PRODUCTION_MANAGER: [
    'master:read',
    'master:write',
    'order:read',
    'order:write',
    'order:upload',
    'inventory:read',
    'inventory:write',
    'molding:read',
    'molding:write',
    'molding:confirm',
    'extrusion:read',
    'extrusion:write',
    'extrusion:confirm',
    'audit:read',
  ],
  MOLDING_LEADER: ['master:read', 'molding:read', 'molding:write', 'molding:result', 'extrusion:read'],
  EXTRUSION_LEADER: ['master:read', 'molding:read', 'extrusion:read', 'extrusion:write', 'extrusion:result'],
  SALES_PURCHASE: ['master:read', 'order:read', 'order:write', 'order:upload'],
  EXECUTIVE: ['master:read', 'order:read', 'inventory:read', 'molding:read', 'extrusion:read', 'audit:read'],
};

type WithRole = { role?: Role | string | null } | null | undefined;

function roleOf(user: WithRole): Role | undefined {
  const role = user?.role;
  return role && (ROLES as readonly string[]).includes(role) ? (role as Role) : undefined;
}

/**
 * 사용자가 특정 권한을 가지는지 판정. Admin('*')은 항상 true. 순수 함수.
 */
export function hasPermission(user: WithRole, permission: Permission): boolean {
  const role = roleOf(user);
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role];
  return granted.includes(WILDCARD) || granted.includes(permission);
}

/**
 * Server Action 가드 — 권한 없으면 ForbiddenError throw.
 */
export function requirePermission(user: WithRole, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError(`Permission required: ${permission}`);
  }
}
