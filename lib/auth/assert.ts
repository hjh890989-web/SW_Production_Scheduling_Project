import type { Role } from '@/auth';

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function assertRole(session: { user?: { role?: string } } | null, allowedRoles: Role[]): void {
  const role = session?.user?.role as Role | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenError(`Role required: ${allowedRoles.join(', ')}`);
  }
}
