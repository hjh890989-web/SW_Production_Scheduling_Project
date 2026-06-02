import { describe, it, expect } from 'vitest';
import { statusSeverity } from './severity';

describe('statusSeverity (T7.1/T7.3)', () => {
  it('STARTED/COMPLETED → critical', () => {
    expect(statusSeverity('STARTED')).toBe('critical');
    expect(statusSeverity('COMPLETED')).toBe('critical');
  });
  it('CONFIRMED → warning', () => {
    expect(statusSeverity('CONFIRMED')).toBe('warning');
  });
  it('AUTO/MANUAL → auto', () => {
    expect(statusSeverity('AUTO')).toBe('auto');
    expect(statusSeverity('MANUAL')).toBe('auto');
  });
  it('AC T7.3-F1: 미정의 status → unknown', () => {
    expect(statusSeverity('XYZ')).toBe('unknown');
  });
});
