/**
 * 감사 이력 조회 where 빌더 (T4.2). RBAC 스코핑을 순수 함수로 분리해 테스트한다.
 * audit:read 미보유자는 본인(userId) 기록만 조회 가능(AC T4.2-F1).
 */
export interface AuditFilter {
  user?: string;
  table?: string;
  action?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface AuditWhere {
  userId?: string;
  targetTable?: string;
  action?: string;
  timestamp?: { gte?: Date; lte?: Date };
}

export function buildAuditWhere(filter: AuditFilter, canViewAll: boolean, userId: string): AuditWhere {
  const where: AuditWhere = {};

  if (!canViewAll) {
    where.userId = userId; // 권한 없으면 본인분만 강제
  } else if (filter.user) {
    where.userId = filter.user;
  }

  if (filter.table) where.targetTable = filter.table;
  if (filter.action) where.action = filter.action;

  if (filter.from || filter.to) {
    where.timestamp = {};
    if (filter.from) where.timestamp.gte = new Date(`${filter.from}T00:00:00.000Z`);
    if (filter.to) where.timestamp.lte = new Date(`${filter.to}T23:59:59.999Z`);
  }

  return where;
}
