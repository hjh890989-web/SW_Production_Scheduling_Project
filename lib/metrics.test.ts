import { describe, it, expect } from 'vitest';
import { renderPrometheus } from './metrics';

describe('renderPrometheus (T4.5)', () => {
  it('HELP·TYPE·값 3줄 형식', () => {
    const out = renderPrometheus([{ name: 'evs_orders_total', help: 'Total orders', type: 'gauge', value: 47 }]);
    expect(out).toContain('# HELP evs_orders_total Total orders');
    expect(out).toContain('# TYPE evs_orders_total gauge');
    expect(out).toContain('evs_orders_total 47');
  });

  it('라벨 렌더링', () => {
    const out = renderPrometheus([{ name: 'evs_build_info', help: 'info', type: 'gauge', value: 1, labels: { version: '0.1.0' } }]);
    expect(out).toContain('evs_build_info{version="0.1.0"} 1');
  });

  it('여러 샘플은 개행으로 구분되고 끝에 개행', () => {
    const out = renderPrometheus([
      { name: 'a', help: 'a', type: 'counter', value: 1 },
      { name: 'b', help: 'b', type: 'gauge', value: 2 },
    ]);
    expect(out.endsWith('\n')).toBe(true);
    expect(out.split('\n').filter((l) => l === 'a 1' || l === 'b 2')).toHaveLength(2);
  });
});
