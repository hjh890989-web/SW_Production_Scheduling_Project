import { describe, it, expect } from 'vitest';
import { requiredPermission } from './route-permissions';

describe('route → permission 매핑 (T1.3)', () => {
  it('/molding 은 molding:read 필요', () => {
    expect(requiredPermission('/molding')).toBe('molding:read');
    expect(requiredPermission('/molding/123')).toBe('molding:read');
  });

  it('/extrusion 은 extrusion:read 필요 (AC T1.3-F1 박철수 차단 근거)', () => {
    expect(requiredPermission('/extrusion')).toBe('extrusion:read');
  });

  it('더 구체적인 /results/molding 이 /molding 보다 우선 매칭', () => {
    expect(requiredPermission('/results/molding')).toBe('molding:read');
    expect(requiredPermission('/results/extrusion')).toBe('extrusion:read');
  });

  it('/orders·/master·/inventory·/audit 매핑', () => {
    expect(requiredPermission('/orders')).toBe('order:read');
    expect(requiredPermission('/master/items')).toBe('master:read');
    expect(requiredPermission('/inventory')).toBe('inventory:read');
    expect(requiredPermission('/audit')).toBe('audit:read');
  });

  it('매핑에 없는 경로(/, /dashboard)는 null = 인증만 필요', () => {
    expect(requiredPermission('/')).toBeNull();
    expect(requiredPermission('/dashboard')).toBeNull();
  });
});
