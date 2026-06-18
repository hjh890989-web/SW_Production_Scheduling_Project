import { describe, it, expect } from 'vitest';
import { detectSourceType } from './detect';

describe('detectSourceType (T3.6)', () => {
  it('실 파일명 3종 인식', () => {
    expect(detectSourceType('실리콘 02월 1주차 주간 계획.xlsx')).toBe('weekly_plan');
    expect(detectSourceType('저압 이중관 KD 발주및 납품현황 26년01월 발주현황.xlsx')).toBe('kd');
    expect(detectSourceType('통합_수주정보_02월_1_2주차.xlsx')).toBe('monthly_forecast');
  });

  it('월예상 — 예상/매출 계획 명칭도 monthly_forecast', () => {
    expect(detectSourceType('06월 실리콘 예상 매출 계획.xlsx')).toBe('monthly_forecast');
    expect(detectSourceType('월예상_06월.xlsx')).toBe('monthly_forecast');
    // 주간/KD 키워드가 함께 있으면 그쪽이 우선(선점 순서 보장)
    expect(detectSourceType('실리콘 06월 4주차 주간 계획.xlsx')).toBe('weekly_plan');
  });

  it('미인식 파일명 → null', () => {
    expect(detectSourceType('무관한파일.xlsx')).toBeNull();
  });

  it('대소문자 무관(KD)', () => {
    expect(detectSourceType('kd_order.xlsx')).toBe('kd');
  });
});
