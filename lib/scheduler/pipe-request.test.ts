import { describe, it, expect } from 'vitest';
import { generatePipeRequests, previousDay } from './pipe-request';

describe('generatePipeRequests (T5.3)', () => {
  it('previousDay: 성형투입 - 1', () => {
    expect(previousDay('2026-05-20')).toBe('2026-05-19');
    expect(previousDay('2026-05-01')).toBe('2026-04-30');
  });

  it('AC T5.3-1: 배치마다 관체수량 = 회전수×앵글당금형×합금형', () => {
    const r = generatePipeRequests(
      [{ itemId: 'P1', productCode: 'P1', date: '2026-05-20', rotations: 8 }],
      { P1: { moldsPerAngle: 10, alloyMold: 2 } },
    );
    expect(r.requests).toHaveLength(1);
    expect(r.requests[0]).toMatchObject({ pipeQuantity: 8 * 10 * 2, extrusionDeadline: '2026-05-19', moldingDate: '2026-05-20' });
  });

  it('AC T5.3-1: 배치 N건 → N 관체 요청', () => {
    const r = generatePipeRequests(
      [
        { itemId: 'P1', productCode: 'P1', date: '2026-05-20', rotations: 4 },
        { itemId: 'P1', productCode: 'P1', date: '2026-05-19', rotations: 4 },
      ],
      { P1: { moldsPerAngle: 5, alloyMold: 1 } },
    );
    expect(r.requests).toHaveLength(2);
  });

  it('AC T5.3-F1: 합금형 누락 → 기본값 1 + 경고(품번당 1회)', () => {
    const r = generatePipeRequests(
      [
        { itemId: 'P1', productCode: 'P1', date: '2026-05-20', rotations: 8 },
        { itemId: 'P1', productCode: 'P1', date: '2026-05-19', rotations: 2 },
      ],
      { P1: { moldsPerAngle: 10, alloyMold: null } },
    );
    expect(r.requests[0].pipeQuantity).toBe(8 * 10 * 1);
    expect(r.warnings.filter((w) => w.itemId === 'P1')).toHaveLength(1); // 품번당 1회
  });

  it('마스터 없으면 경고 + 생략', () => {
    const r = generatePipeRequests([{ itemId: 'X', productCode: 'X', date: '2026-05-20', rotations: 1 }], {});
    expect(r.requests).toHaveLength(0);
    expect(r.warnings[0].reason).toContain('마스터');
  });
});
