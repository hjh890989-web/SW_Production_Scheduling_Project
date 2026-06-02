import { describe, it, expect } from 'vitest';
import { skeletonKeys } from './skeleton';

describe('skeletonKeys (T12.5.4)', () => {
  it('count개 안정 key', () => {
    expect(skeletonKeys(3)).toEqual(['sk-0', 'sk-1', 'sk-2']);
    expect(skeletonKeys(2, 'kpi')).toEqual(['kpi-0', 'kpi-1']);
  });

  it('음수/소수는 안전 처리', () => {
    expect(skeletonKeys(-1)).toEqual([]);
    expect(skeletonKeys(2.9)).toHaveLength(2);
  });
});
