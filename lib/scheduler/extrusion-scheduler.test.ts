import { describe, it, expect } from 'vitest';
import { generateExtrusionSchedule, type ExtrusionInput, type ExtrusionItem } from './extrusion-scheduler';
import { setupChangeCount } from '@/lib/extrusion/die-change';

const WORKDAYS = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'];
const EXTRUDERS = [{ code: 'FORD', isActive: true }, { code: 'NEW', isActive: true }];

function item(id: string, g: number, hp: string, opts: Partial<ExtrusionItem> = {}): ExtrusionItem {
  return { itemId: id, productCode: id, extrusionGroup: g, headPin: hp, extruderFord: true, extruderNew: false, ...opts };
}

function run(over: Partial<ExtrusionInput>): ReturnType<typeof generateExtrusionSchedule> {
  const base: ExtrusionInput = {
    pipeRequests: [],
    items: {},
    extruders: EXTRUDERS,
    workdays: WORKDAYS,
    shiftCapacity: 100,
    efficiency: 0.75,
  };
  return generateExtrusionSchedule({ ...base, ...over });
}

describe('generateExtrusionSchedule (T6.1)', () => {
  it('AC T6.1-2: 모든 배치는 D-1(deadline) 이내', () => {
    const r = run({
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-21', pipeQuantity: 50 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    expect(r.schedules.every((s) => s.date <= '2026-05-21')).toBe(true);
  });

  it('AC T6.1-1: (E그룹,헤드핀) 동일 품번을 같은 압출기/연속 셀에 묶음 → 셋업 최소', () => {
    // 두 그룹이 deadline으로 교차해도 그룹별로 묶여야 함
    const reqs = [
      { itemId: 'A1', productCode: 'A1', extrusionDeadline: '2026-05-21', pipeQuantity: 50 },
      { itemId: 'B1', productCode: 'B1', extrusionDeadline: '2026-05-21', pipeQuantity: 50 },
      { itemId: 'A2', productCode: 'A2', extrusionDeadline: '2026-05-21', pipeQuantity: 50 },
    ];
    const items = {
      A1: item('A1', 1, '22*8'), A2: item('A2', 1, '22*8'), B1: item('B1', 2, '25*8'),
    };
    const r = run({ pipeRequests: reqs, items });
    // A 그룹(1,22*8)은 한 압출기, B 그룹(2,25*8)은 다른 압출기 또는 분리 → 셋업 변경 적음
    const changes = setupChangeCount(r.schedules);
    expect(changes).toBeLessThanOrEqual(1);
  });

  it('신규 우선: extruderNew 호환 단일 그룹 → NEW 배정', () => {
    const r = run({
      pipeRequests: [{ itemId: 'N1', productCode: 'N1', extrusionDeadline: '2026-05-21', pipeQuantity: 10 }],
      items: { N1: item('N1', 1, '22*8', { extruderFord: false, extruderNew: true }) },
    });
    expect(r.schedules.every((s) => s.extruderCode === 'NEW')).toBe(true);
  });

  it('효율 75% 반영: 셀 용량 = floor(capacity*0.75)', () => {
    const r = run({
      shiftCapacity: 100,
      efficiency: 0.75,
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-18', pipeQuantity: 75 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    // 한 셀에 75 들어감(=floor(75))
    expect(r.schedules[0].quantity).toBe(75);
  });

  it('AC T6.1-F1 보강: 가용 셀 부족 → 부분 배치 + warning(throw X)', () => {
    const r = run({
      shiftCapacity: 10,
      efficiency: 1,
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-18', pipeQuantity: 100000 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    expect(r.warnings.some((w) => w.reason.includes('부분 배치'))).toBe(true);
    expect(r.schedules.length).toBeGreaterThan(0);
  });

  it('D-1 마감 전 영업일 없음 → warning', () => {
    const r = run({
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-10', pipeQuantity: 10 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    expect(r.warnings.some((w) => w.reason.includes('D-1'))).toBe(true);
  });

  it('가용 압출기 없음(전부 비호환·비가동) → warning', () => {
    const r = run({
      extruders: [{ code: 'FORD', isActive: false }, { code: 'NEW', isActive: false }],
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-21', pipeQuantity: 10 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    expect(r.schedules).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('모든 status AUTO', () => {
    const r = run({
      pipeRequests: [{ itemId: 'P1', productCode: 'P1', extrusionDeadline: '2026-05-21', pipeQuantity: 30 }],
      items: { P1: item('P1', 1, '22*8') },
    });
    expect(r.schedules.every((s) => s.status === 'AUTO')).toBe(true);
  });
});
