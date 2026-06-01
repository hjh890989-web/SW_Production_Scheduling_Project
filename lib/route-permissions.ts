import type { Permission } from '@/lib/permissions';

/**
 * 페이지 경로 → 필요 권한 매핑 (T1.3). Edge·테스트 양쪽에서 쓰는 순수 데이터/함수.
 * 더 구체적인 경로(/results/molding)를 일반 경로(/molding)보다 먼저 검사한다.
 */
export const ROUTE_PERMISSIONS: ReadonlyArray<{ prefix: string; permission: Permission }> = [
  { prefix: '/results/molding', permission: 'molding:read' },
  { prefix: '/results/extrusion', permission: 'extrusion:read' },
  { prefix: '/orders', permission: 'order:read' },
  { prefix: '/master', permission: 'master:read' },
  { prefix: '/inventory', permission: 'inventory:read' },
  { prefix: '/molding', permission: 'molding:read' },
  { prefix: '/extrusion', permission: 'extrusion:read' },
  { prefix: '/audit', permission: 'audit:read' },
];

/** 경로에 필요한 권한을 반환. 매핑에 없으면 null(= 인증만 필요). */
export function requiredPermission(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match?.permission ?? null;
}
