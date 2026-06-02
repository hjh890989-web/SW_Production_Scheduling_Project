import { describe, it, expect } from 'vitest';
import { cellClass, statusBadge, SCHEDULE_LEGEND } from './cell-style';

describe('cell-style (T5.5)', () => {
  it('자동=회색 / 수동=파랑 테두리 / 확정=초록', () => {
    expect(cellClass('AUTO')).toContain('gray');
    expect(cellClass('MANUAL')).toContain('blue');
    expect(cellClass('CONFIRMED')).toContain('green');
  });

  it('룰 위반 → 빨간 ring 추가(차단 아님)', () => {
    expect(cellClass('MANUAL', true)).toContain('ring-red-500');
    expect(cellClass('AUTO', false)).not.toContain('ring-red-500');
  });

  it('확정만 체크 마크', () => {
    expect(statusBadge('CONFIRMED')).toBe('✓');
    expect(statusBadge('AUTO')).toBe('');
  });

  it('범례 4종', () => {
    expect(SCHEDULE_LEGEND).toHaveLength(4);
  });
});
