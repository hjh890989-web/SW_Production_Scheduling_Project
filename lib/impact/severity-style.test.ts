import { describe, it, expect } from 'vitest';
import { severityStyle, severityLabel, SEVERITY_LEGEND } from './severity-style';

describe('severity-style (T7.3)', () => {
  it('critical 빨강 / warning 노랑 / auto 초록', () => {
    expect(severityStyle('critical')).toContain('red');
    expect(severityStyle('warning')).toContain('amber');
    expect(severityStyle('auto')).toContain('green');
  });
  it('AC T7.3-F1: unknown → 회색 fallback', () => {
    expect(severityStyle('unknown')).toContain('gray');
  });
  it('라벨', () => {
    expect(severityLabel('critical')).toContain('진행중');
  });
  it('범례 3종', () => {
    expect(SEVERITY_LEGEND).toHaveLength(3);
  });
});
